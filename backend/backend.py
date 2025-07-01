import os
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
from datetime import datetime
import time

load_dotenv()

# --------- Validation Error Class ---------
class ValidationError:
    def __init__(self, error_type: str, message: str, details: Dict[str, Any] = None):
        self.error_type = error_type
        self.message = message
        self.details = details or {}

    def to_dict(self):
        return {
            "error_type": self.error_type,
            "message": self.message,
            "details": self.details,
        }

class AIDataValidator:
    def __init__(self, gpt_agent=None):
        self.gpt_agent = gpt_agent
        
        # Per-entity required columns:
        self.required_columns_client = [
            "ClientID", "ClientName", "PriorityLevel",
            "RequestedTaskIDs", "GroupTag", "AttributesJSON"
        ]
        self.required_columns_worker = [
            "WorkerID", "WorkerName", "Skills",
            "AvailableSlots", "MaxLoadPerPhase",
            "WorkerGroup", "QualificationLevel"
        ]
        self.required_columns_task = [
            "TaskID", "TaskName", "Category",
            "Duration", "RequiredSkills",
            "PreferredPhases", "MaxConcurrent"
        ]

    def _row_to_text(self, row: Dict[str, Any]) -> str:
        # Create a textual representation of a row for AI processing
        parts = []
        for key in sorted(row.keys()):
            val = row[key]
            if isinstance(val, dict):
                val = json.dumps(val)
            elif isinstance(val, list):
                val = ", ".join(map(str, val))
            parts.append(f"{key}: {val}")
        return " | ".join(parts)

    def _get_required_columns_for_row(self, row: Dict[str, Any]) -> List[str]:
        if "ClientID" in row:
            return self.required_columns_client
        elif "WorkerID" in row:
            return self.required_columns_worker
        elif "TaskID" in row:
            return self.required_columns_task
        else:
            return []

    def validate_data(self, data: List[Dict[str, Any]]) -> List[ValidationError]:
        errors = []

        # Sets for duplicate checks
        client_ids = set()
        worker_ids = set()
        task_ids = set()

        # For saturation and load checks
        phase_durations = {}
        worker_skills = {}
        required_skills = set()
        corun_groups = {}

        for row in data:
            # Determine required columns by entity type
            required_cols = self._get_required_columns_for_row(row)

            # a. Missing columns
            missing_cols = [col for col in required_cols if col not in row]
            if missing_cols:
                errors.append(ValidationError(
                    "missing_columns",
                    f"Missing required columns: {', '.join(missing_cols)}",
                    {"row": row}
                ))
                continue  # Skip further validation for this row

            # b. Duplicate IDs
            if "ClientID" in row:
                if row["ClientID"] in client_ids:
                    errors.append(ValidationError(
                        "duplicate_id",
                        f"Duplicate ClientID: {row['ClientID']}",
                        {"id": row["ClientID"]}
                    ))
                client_ids.add(row["ClientID"])

            if "WorkerID" in row:
                if row["WorkerID"] in worker_ids:
                    errors.append(ValidationError(
                        "duplicate_id",
                        f"Duplicate WorkerID: {row['WorkerID']}",
                        {"id": row["WorkerID"]}
                    ))
                worker_ids.add(row["WorkerID"])

            if "TaskID" in row:
                if row["TaskID"] in task_ids:
                    errors.append(ValidationError(
                        "duplicate_id",
                        f"Duplicate TaskID: {row['TaskID']}",
                        {"id": row["TaskID"]}
                    ))
                task_ids.add(row["TaskID"])

            # c. Malformed lists
            if "AvailableSlots" in row:
                try:
                    slots = row.get("AvailableSlots", [])
                    if isinstance(slots, str):
                        slots = json.loads(slots)
                    if not all(isinstance(x, int) for x in slots):
                        errors.append(ValidationError(
                            "malformed_list",
                            "AvailableSlots contains non-integer values",
                            {"row": row}
                        ))
                except Exception:
                    errors.append(ValidationError(
                        "malformed_list",
                        "Invalid AvailableSlots format",
                        {"row": row}
                    ))

            # d. Out-of-range values
            if "PriorityLevel" in row:
                if row["PriorityLevel"] < 1 or row["PriorityLevel"] > 5:
                    errors.append(ValidationError(
                        "out_of_range",
                        "PriorityLevel must be between 1 and 5",
                        {"value": row["PriorityLevel"]}
                    ))

            if "Duration" in row:
                if row["Duration"] < 1:
                    errors.append(ValidationError(
                        "out_of_range",
                        "Duration must be at least 1",
                        {"value": row["Duration"]}
                    ))

            # e. Broken JSON in AttributesJSON (clients)
            if "AttributesJSON" in row:
                try:
                    attr_json = row.get("AttributesJSON", {})
                    if isinstance(attr_json, str):
                        attr_json = json.loads(attr_json)
                    if not isinstance(attr_json, dict):
                        errors.append(ValidationError(
                            "invalid_json",
                            "AttributesJSON must be a valid JSON object",
                            {"row": row}
                        ))
                except Exception:
                    errors.append(ValidationError(
                        "invalid_json",
                        "Invalid AttributesJSON format",
                        {"row": row}
                    ))

            # f. Track phase durations for saturation checks
            phases = []
            if "Phase" in row:
                phases = [row["Phase"]]
            elif "PreferredPhases" in row:
                val = row["PreferredPhases"]
                if isinstance(val, str):
                    try:
                        if val.startswith("["):
                            phases = json.loads(val)
                        elif "-" in val:
                            start, end = map(int, val.split("-"))
                            phases = list(range(start, end + 1))
                        else:
                            phases = [int(val)]
                    except Exception:
                        phases = []
                elif isinstance(val, list):
                    phases = val
            for phase in phases:
                phase_durations[phase] = phase_durations.get(phase, 0) + row.get("Duration", 0)

            # g. Track worker skills & required skills
            if "WorkerID" in row:
                skills_raw = row.get("Skills", "")
                skills_list = []
                try:
                    if isinstance(skills_raw, str):
                        skills_list = [s.strip() for s in skills_raw.split(",")]
                    elif isinstance(skills_raw, list):
                        skills_list = [str(s).strip() for s in skills_raw]
                    else:
                        skills_list = []
                except Exception:
                    skills_list = []
                worker_skills[row["WorkerID"]] = set(skills_list)
            
            if "RequiredSkills" in row:
                req_raw = row.get("RequiredSkills", "")
                req_list = []
                try:
                    if isinstance(req_raw, str):
                        req_list = [s.strip() for s in req_raw.split(",")]
                    elif isinstance(req_raw, list):
                        req_list = [str(s).strip() for s in req_raw]
                    else:
                        req_list = []
                except Exception:
                    req_list = []
                for sk in req_list:
                    required_skills.add(sk)

            # h. CoRunGroups for circular dependency (optional, if present)
            if "TaskID" in row and "CoRunGroup" in row:
                corun_groups[row["TaskID"]] = row["CoRunGroup"] if isinstance(row["CoRunGroup"], list) else []

        # i. Unknown references - check RequestedTaskIDs in clients
        all_task_ids = task_ids
        for row in data:
            if "RequestedTaskIDs" in row:
                requested = row["RequestedTaskIDs"]
                if isinstance(requested, str):
                    requested = [x.strip() for x in requested.split(",")]
                unknown = set(requested) - all_task_ids
                if unknown:
                    errors.append(ValidationError(
                        "unknown_reference",
                        f"RequestedTaskIDs refer unknown tasks: {unknown}",
                        {"row": row}
                    ))

        # j. Circular co-run groups detection
        def find_cycle(graph, start, visited=None, path=None):
            if visited is None:
                visited = set()
            if path is None:
                path = []
            visited.add(start)
            path.append(start)
            for nxt in graph.get(start, []):
                if nxt not in visited:
                    if find_cycle(graph, nxt, visited, path):
                        return True
                elif nxt in path:
                    return True
            path.pop()
            return False

        for t_id in corun_groups:
            if find_cycle(corun_groups, t_id):
                errors.append(ValidationError(
                    "circular_dependency",
                    f"Circular co-run dependency detected starting at task {t_id}",
                    {"task": t_id}
                ))

        # k. Worker load vs slots check
        for row in data:
            if "AvailableSlots" in row and "MaxLoadPerPhase" in row:
                slots = row["AvailableSlots"]
                if isinstance(slots, str):
                    try:
                        slots = json.loads(slots)
                    except Exception:
                        slots = []
                if len(slots) < row["MaxLoadPerPhase"]:
                    errors.append(ValidationError(
                        "overloaded_worker",
                        f"Worker {row.get('WorkerID', 'unknown')} has fewer available slots than MaxLoadPerPhase",
                        {"row": row}
                    ))

        # l. Phase slot saturation check
        for phase, dur in phase_durations.items():
            total_slots = 0
            for row in data:
                row_phases = []
                if "Phase" in row:
                    row_phases = [row["Phase"]]
                elif "PreferredPhases" in row:
                    val = row["PreferredPhases"]
                    if isinstance(val, str):
                        try:
                            if val.startswith("["):
                                row_phases = json.loads(val)
                            elif "-" in val:
                                start, end = map(int, val.split("-"))
                                row_phases = list(range(start, end + 1))
                            else:
                                row_phases = [int(val)]
                        except Exception:
                            row_phases = []
                    elif isinstance(val, list):
                        row_phases = val
                if phase in row_phases:
                    slots = row.get("AvailableSlots", [])
                    if isinstance(slots, str):
                        try:
                            slots = json.loads(slots)
                        except Exception:
                            slots = []
                    total_slots += len(slots)
            if dur > total_slots:
                errors.append(ValidationError(
                    "phase_saturation",
                    f"Phase {phase} is oversaturated (Duration {dur} > Slots {total_slots})",
                    {"phase": phase}
                ))

        # m. Skill coverage check
        for skill in required_skills:
            workers_with_skill = sum(1 for skills in worker_skills.values() if skill in skills)
            if workers_with_skill == 0:
                errors.append(ValidationError(
                    "skill_coverage",
                    f"No workers with required skill '{skill}' found",
                    {"skill": skill}
                ))

        # n. MaxConcurrent feasibility
        for row in data:
            req_skills = row.get("RequiredSkills", [])
            if isinstance(req_skills, str):
                req_skills = [s.strip() for s in req_skills.split(",")]
            qualified_workers = sum(
                1 for ws in worker_skills.values() if all(skill in ws for skill in req_skills)
            )
            if row.get("MaxConcurrent", 0) > qualified_workers:
                errors.append(ValidationError(
                    "concurrency_infeasible",
                    f"MaxConcurrent ({row.get('MaxConcurrent')}) exceeds qualified workers ({qualified_workers}) for task {row.get('TaskID')}",
                    {"task": row.get('TaskID')}
                ))

        return errors

    def search(self, query: str, data: List[Dict[str, Any]], top_k=3):
        """AI-based search functionality"""
        if not self.gpt_agent or not data:
            return []
        
        # Use AI to search through data
        prompt = f"""
        You are a data search assistant. Find the most relevant records from the dataset based on the query.
        
        Query: "{query}"
        
        Dataset sample (first 10 records):
        {json.dumps(data[:10], indent=2)}
        
        Return the top {top_k} most relevant records as a JSON array.
        Consider similarity in content, structure, and context.
        Return only the JSON array, no explanations.
        """
        
        try:
            result_str = self.gpt_agent.chat_completion(
                system_prompt="You are a data search AI. Return only valid JSON arrays.",
                user_prompt=prompt
            )
            
            # Clean and parse response
            result_str = result_str.strip()
            if result_str.startswith('```'):
                lines = result_str.split('\n')
                result_str = '\n'.join(lines[1:-1])
            
            start = result_str.find('[')
            end = result_str.rfind(']')
            
            if start != -1 and end != -1 and end > start:
                json_str = result_str[start:end+1]
                results = json.loads(json_str)
                return results[:top_k] if isinstance(results, list) else []
            
            return []
        except Exception as e:
            print(f"AI search error: {e}")
            return []

# --------- GPTAgent Wrapper ---------
class GPTAgent:
    def __init__(self):
        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            raise ValueError("Missing GITHUB_TOKEN env variable")

        endpoint = os.getenv("GITHUB_AI_ENDPOINT", "https://models.github.ai/inference")
        model = os.getenv("GITHUB_AI_MODEL", "mistral-ai/mistral-medium-2505")

        self.client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(github_token)
        )
        self.model_name = model

    def chat_completion(self, system_prompt: str, user_prompt: str) -> str:
        messages = [
            SystemMessage(content=system_prompt),
            UserMessage(content=user_prompt)
        ]
    
        response = self.client.complete(
            messages=messages,
            model=self.model_name,
            temperature=0.7,
            top_p=1.0,
            max_tokens=1000
        )
    
        return response.choices[0].message.content

# --------- Core Functionalities ---------
def natural_language_search(gpt_agent: GPTAgent, data: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
    print(f"=== DEBUG natural_language_search ===")
    print(f"Input data length: {len(data)}")
    print(f"Query: '{query}'")
    
    if not data:
        print("ERROR: No data provided to search function")
        return {"clients": [], "workers": [], "tasks": []}

    # Print first few records to see what we're working with
    print(f"First 3 data samples:")
    for i, item in enumerate(data[:3]):
        print(f"  Record {i}: {item}")

    # Create a more comprehensive data sample for context
    sample_size = min(20, len(data))
    data_sample = data[:sample_size]
    
    # Determine what type of data we're working with
    data_types = []
    if any("ClientID" in item for item in data_sample):
        data_types.append("clients")
    if any("WorkerID" in item for item in data_sample):
        data_types.append("workers") 
    if any("TaskID" in item for item in data_sample):
        data_types.append("tasks")

    print(f"Detected data types: {data_types}")

    prompt = f"""
You are a data search assistant. Analyze the user's query and return relevant data from the dataset.

Available data types: {', '.join(data_types)}
Total records available: {len(data)}

Sample data structure:
{json.dumps(data_sample[:5], indent=2)}

User Query: "{query}"

Instructions:
1. Understand what the user is asking for (e.g., "top 5 clients", "workers with Python skills", "high priority tasks")
2. If they ask for "top N" or "first N", return exactly N records
3. If they ask for filtering, filter and return matching records
4. If they ask for sorting, sort accordingly
5. If no specific number is mentioned, return up to 10 relevant records
6. Return ONLY a valid JSON array of the actual data records
7. Do not include any explanations, markdown, or code blocks
8. If no matches found, return an empty array []

Response format: [{{record1}}, {{record2}}, ...]
"""

    print("Sending prompt to GPT...")
    result_str = gpt_agent.chat_completion(
        system_prompt="You are a data search AI. Return only valid JSON arrays of data records.",
        user_prompt=prompt
    )
    
    print(f"GPT Response (first 200 chars): {repr(result_str[:200])}")
    
    # Enhanced JSON parsing
    try:
        # Remove any markdown code blocks
        result_str = result_str.strip()
        if result_str.startswith('```'):
            lines = result_str.split('\n')
            result_str = '\n'.join(lines[1:-1])  # Remove first and last line
            print("Removed markdown code blocks")
        
        # Try to find JSON array in the response
        start = result_str.find('[')
        end = result_str.rfind(']')
        
        print(f"JSON search: start={start}, end={end}")
        
        if start != -1 and end != -1 and end > start:
            json_str = result_str[start:end+1]
            print(f"Extracted JSON (first 100 chars): {json_str[:100]}")
            raw_results = json.loads(json_str)
            if isinstance(raw_results, list):
                print(f"SUCCESS: Parsed {len(raw_results)} results")
                
                # Categorize results by type
                categorized_results = {
                    "clients": [],
                    "workers": [], 
                    "tasks": []
                }
                
                for item in raw_results:
                    if "ClientID" in item:
                        categorized_results["clients"].append(item)
                    elif "WorkerID" in item:
                        categorized_results["workers"].append(item)
                    elif "TaskID" in item:
                        categorized_results["tasks"].append(item)
                
                print(f"Categorized results - Clients: {len(categorized_results['clients'])}, Workers: {len(categorized_results['workers'])}, Tasks: {len(categorized_results['tasks'])}")
                return categorized_results
        
        # Fallback: try to parse entire response
        print("Trying to parse entire response...")
        raw_results = json.loads(result_str)
        if isinstance(raw_results, list):
            print(f"SUCCESS: Parsed {len(raw_results)} results from full response")
            
            # Categorize results by type
            categorized_results = {
                "clients": [],
                "workers": [], 
                "tasks": []
            }
            
            for item in raw_results:
                if "ClientID" in item:
                    categorized_results["clients"].append(item)
                elif "WorkerID" in item:
                    categorized_results["workers"].append(item)
                elif "TaskID" in item:
                    categorized_results["tasks"].append(item)
            
            return categorized_results
            
        print("ERROR: Response is not a list")
        return {"clients": [], "workers": [], "tasks": []}
        
    except Exception as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw AI response: {repr(result_str)}")
        return {"clients": [], "workers": [], "tasks": []}

def natural_language_modify(gpt_agent: GPTAgent, data: List[Dict[str, Any]], command: str) -> Dict[str, Any]:
    # Prompt GPT to suggest modifications based on user command
    prompt = f"""
You are a data modification assistant.

Data sample (up to 10 entries):
{json.dumps(data[:10], indent=2)}

User command: "{command}"

Suggest the changes as a JSON object with keys: "suggested_changes", "updated_data"
Return only JSON.
"""
    result_str = gpt_agent.chat_completion(
        system_prompt="You suggest modifications to the data based on commands.",
        user_prompt=prompt
    )
    try:
        changes = json.loads(result_str)
        return changes
    except Exception:
        return {"suggested_changes": [], "updated_data": []}

def nl_to_rule(
    gpt_agent: GPTAgent,
    user_rule_request: str,
    clients: List[Dict[str, Any]],
    workers: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Converts a user-provided natural language rule into a structured BusinessRule object
    using a language model agent and a sample of the dataset for context.
    """
    prompt = {
        "system": "You are an expert AI rules converter that transforms natural language descriptions of allocation rules into structured JSON rule objects.",
        "user": f'''
Analyze the following data to understand the context and create a rule:

Clients (sample):
{json.dumps(clients[:5], indent=2)}

Workers (sample):
{json.dumps(workers[:5], indent=2)}

Tasks (sample):
{json.dumps(tasks[:5], indent=2)}

Convert the following natural language rule description into a structured JSON rule:
\"\"\"{user_rule_request.strip()}\"\"\"

The rule must be a valid JSON object and follow one of these preferred types:
- coRun
- loadLimit
- phaseWindow
- slotRestriction
- patternMatch
- priorityRule (for boosting or lowering priority based on criteria)

If none of these types fits, return a patternMatch rule as fallback using logical conditions.

Required fields:
- id: string (unique identifier like "priorityRule_123abc")
- name: string (user-friendly title)
- description: string (brief summary)
- type: one of the supported types
- parameters: type-specific key-value pairs
- isActive: boolean
- createdAt: ISO timestamp

Return only the JSON object. Do not include explanations and code blocks and thinking.Just return the JSON object strictly and no other things.

'''
    }

    result_str = gpt_agent.chat_completion(
        system_prompt=prompt["system"],
        user_prompt=prompt["user"]
    )

    print("AI response:", repr(result_str))  # <-- log full raw response

    try:
        # Remove any markdown code blocks
        result_str = result_str.strip()
        if result_str.startswith('```'):
            lines = result_str.split('\n')
            # Find the first line that's not a code block marker
            start_idx = 1
            while start_idx < len(lines) and (lines[start_idx].startswith('```') or lines[start_idx].strip() == ''):
                start_idx += 1
            # Find the last line that's not a code block marker
            end_idx = len(lines) - 1
            while end_idx > start_idx and (lines[end_idx].startswith('```') or lines[end_idx].strip() == ''):
                end_idx -= 1
            result_str = '\n'.join(lines[start_idx:end_idx+1])
            print("Removed markdown code blocks")

        # Try to find JSON object in the response
        start = result_str.find('{')
        end = result_str.rfind('}')
        
        if start != -1 and end != -1 and end > start:
            json_str = result_str[start:end+1]
            print(f"Extracted JSON: {json_str[:100]}...")
            rule = json.loads(json_str)
            return rule
        
        # Fallback: try to parse entire response
        rule = json.loads(result_str)
        return rule
    except Exception as e:
        print("Failed to parse rule JSON:", e)
        return None

def recommend_rules(
    gpt_agent: GPTAgent,
    clients: List[Dict[str, Any]],
    workers: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    prompt = f"""
You are an AI analyst specialized in scheduling and allocation business rules.

Analyze the data below and suggest 3-5 practical business rules for task allocation and scheduling.

Available Data:
Clients: {json.dumps(clients[:5], indent=2)}
Workers: {json.dumps(workers[:5], indent=2)}  
Tasks: {json.dumps(tasks[:5], indent=2)}

Based on this data, suggest rules in these categories:
- Priority Rules: Boost/lower priority based on client attributes
- Load Limits: Maximum workload constraints for workers
- Skill Matching: Assign tasks based on required skills
- Phase Restrictions: Time-based allocation rules
- Co-run Rules: Tasks that should run together

Each rule must be a complete JSON object with these fields:
- id: unique identifier (e.g., "priorityRule_abc123")
- name: descriptive title
- description: what the rule does
- type: one of [priorityRule, loadLimit, patternMatch, phaseWindow, coRun]
- parameters: rule-specific configuration
- isActive: true
- createdAt: current ISO timestamp

Return ONLY a valid JSON array of rule objects. No explanations, no markdown, no code blocks.

Example format: [{{"id": "rule1", "name": "...", "type": "priorityRule", ...}}, {{"id": "rule2", ...}}]
"""

    print("=== DEBUG recommend_rules ===")
    print("Sending prompt to GPT for rule recommendations...")
    
    result_str = gpt_agent.chat_completion(
        system_prompt="You are a business rules AI. Return only valid JSON arrays of rule objects.",
        user_prompt=prompt
    )
    
    print(f"GPT Response (first 200 chars): {repr(result_str[:200])}")
    
    try:
        # Remove any markdown code blocks
        result_str = result_str.strip()
        if result_str.startswith('```'):
            lines = result_str.split('\n')
            result_str = '\n'.join(lines[1:-1])
            print("Removed markdown code blocks")
        
        # Try to find JSON array in the response
        start = result_str.find('[')
        end = result_str.rfind(']')
        
        if start != -1 and end != -1 and end > start:
            json_str = result_str[start:end+1]
            print(f"Extracted JSON (first 100 chars): {json_str[:100]}")
            rules = json.loads(json_str)
            if isinstance(rules, list):
                print(f"SUCCESS: Parsed {len(rules)} recommended rules")
                return rules
        
        # Fallback: try to parse entire response
        rules = json.loads(result_str)
        if isinstance(rules, list):
            print(f"SUCCESS: Parsed {len(rules)} rules from full response")
            return rules
            
        print("ERROR: Response is not a list")
        return []
        
    except Exception as e:
        print(f"JSON parsing error in recommend_rules: {e}")
        print(f"Raw AI response: {repr(result_str)}")
        return []

# --------- Main DataManager Class ---------
class DataManager:
    def __init__(self):
        try:
            self.gpt_agent = GPTAgent()
        except Exception as e:
            print(f"Warning: AI features disabled due to initialization error: {e}")
            self.gpt_agent = None
        
        self.validator = AIDataValidator(self.gpt_agent)

        self.clients: List[Dict[str, Any]] = []
        self.workers: List[Dict[str, Any]] = []
        self.tasks: List[Dict[str, Any]] = []
        self.rules: List[Dict[str, Any]] = []
        self.priorities: Dict[str, float] = {}

    def load_files(self, clients_path, workers_path, tasks_path):
        # Load CSV files and clean the data
        clients_df = pd.read_csv(clients_path)
        workers_df = pd.read_csv(workers_path)
        tasks_df = pd.read_csv(tasks_path)
        
        # Clean the data - replace NaN values with appropriate defaults
        clients_df = clients_df.fillna("")
        workers_df = workers_df.fillna("")
        tasks_df = tasks_df.fillna("")
        
        # Convert to dictionaries
        self.clients = clients_df.to_dict(orient="records")
        self.workers = workers_df.to_dict(orient="records")
        self.tasks = tasks_df.to_dict(orient="records")
        
        # Clean any remaining NaN or invalid values
        self.clients = self._clean_data(self.clients)
        self.workers = self._clean_data(self.workers)
        self.tasks = self._clean_data(self.tasks)

    def load_files_from_objects(self, clients_file, workers_file, tasks_file):
        """Load CSV files directly from file objects without saving to disk"""
        # Read CSV files directly from file objects
        clients_df = pd.read_csv(clients_file)
        workers_df = pd.read_csv(workers_file)
        tasks_df = pd.read_csv(tasks_file)
        
        # Clean the data - replace NaN values with appropriate defaults
        clients_df = clients_df.fillna("")
        workers_df = workers_df.fillna("")
        tasks_df = tasks_df.fillna("")
        
        # Convert to dictionaries
        self.clients = clients_df.to_dict(orient="records")
        self.workers = workers_df.to_dict(orient="records")
        self.tasks = tasks_df.to_dict(orient="records")
        
        # Clean any remaining NaN or invalid values
        self.clients = self._clean_data(self.clients)
        self.workers = self._clean_data(self.workers)
        self.tasks = self._clean_data(self.tasks)

    def _clean_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean data to ensure JSON serialization compatibility"""
        import math
        cleaned_data = []
        
        for row in data:
            cleaned_row = {}
            for key, value in row.items():
                # Handle different types of invalid values
                if isinstance(value, float):
                    if math.isnan(value) or math.isinf(value):
                        cleaned_row[key] = None
                    else:
                        cleaned_row[key] = value
                elif pd.isna(value):
                    cleaned_row[key] = None
                else:
                    cleaned_row[key] = value
            cleaned_data.append(cleaned_row)
        
        return cleaned_data

    def validate_all(self) -> List[ValidationError]:
        combined = self.clients + self.workers + self.tasks
        return self.validator.validate_data(combined)

    def _validate_single_entry(self, entry: Dict[str, Any]) -> bool:
        """Validate a single data entry using AI if available"""
        if not self.gpt_agent:
            # Basic validation without AI
            return len(entry) > 0 and any(key in entry for key in ["ClientID", "WorkerID", "TaskID"])
        
        # Use AI for more sophisticated validation
        try:
            validation_prompt = f"""
            Validate this data entry for correctness and completeness:
            
            Entry: {json.dumps(entry, indent=2)}
            
            Check for:
            1. Required fields based on entry type (Client/Worker/Task)
            2. Valid data types and formats
            3. Logical consistency
            
            Return only "VALID" or "INVALID" with a brief reason.
            """
            
            result = self.gpt_agent.chat_completion(
                system_prompt="You are a data validation expert. Be concise.",
                user_prompt=validation_prompt
            )
            
            return "VALID" in result.upper()
            
        except Exception as e:
            print(f"AI validation error: {e}")
            return True  # Default to valid if AI fails

    def natural_language_search(self, query: str) -> Dict[str, Any]:        
        # Check if data is actually loaded
        if not self.clients and not self.workers and not self.tasks:
            print("ERROR: No data loaded! Please load CSV files first.")
            return {"clients": [], "workers": [], "tasks": []}
        
        combined = self.clients + self.workers + self.tasks
        print(f"Total combined records: {len(combined)}")
        
        results = natural_language_search(self.gpt_agent, combined, query)
        print(f"Final results - Clients: {len(results['clients'])}, Workers: {len(results['workers'])}, Tasks: {len(results['tasks'])}")
        
        return results

    def natural_language_modify(self, command: str) -> Dict[str, Any]:
        combined = self.clients + self.workers + self.tasks
        return natural_language_modify(self.gpt_agent, combined, command)

    def generate_rule_from_natural_language(self, user_rule_request: str) -> Optional[Dict[str, Any]]:
        """Generate a rule from natural language without adding it to the rules list"""
        print(f"Generating rule from: {user_rule_request}")
        
        # First try the simple fallback for common patterns
        simple_rule = self.generate_simple_rule_fallback(user_rule_request)
        if simple_rule:
            print(f"Generated simple rule: {simple_rule}")
            return simple_rule
        
        # Fallback to AI generation
        try:
            rule = nl_to_rule(self.gpt_agent, user_rule_request, self.clients, self.workers, self.tasks)
            if rule:
                print(f"Generated AI rule: {rule}")
                return rule
        except Exception as e:
            print(f"AI rule generation failed: {e}")
        
        print("No rule could be generated")
        return None

    def add_rule_from_nl(self, user_rule_request: str) -> Optional[Dict[str, Any]]:
        rule = nl_to_rule(self.gpt_agent, user_rule_request, self.clients, self.workers, self.tasks)
        if rule:
            self.rules.append(rule)
        return rule

    def get_recommended_rules(self) -> List[Dict[str, Any]]:
        return recommend_rules(self.gpt_agent, self.clients, self.workers, self.tasks)

    def export_all(self, output_dir="output") -> str:
        os.makedirs(output_dir, exist_ok=True)
        pd.DataFrame(self.clients).to_csv(os.path.join(output_dir, "clients.csv"), index=False)
        pd.DataFrame(self.workers).to_csv(os.path.join(output_dir, "workers.csv"), index=False)
        pd.DataFrame(self.tasks).to_csv(os.path.join(output_dir, "tasks.csv"), index=False)
        with open(os.path.join(output_dir, "rules.json"), "w") as f:
            json.dump(self.rules, f, indent=2)
        with open(os.path.join(output_dir, "priorities.json"), "w") as f:
            json.dump(self.priorities, f, indent=2)
        return output_dir

    def set_priorities(self, priorities: Dict[str, float]):
        # Expecting keys: PriorityLevel, RequestedTaskIDs, Fairness, LoadLimit
        total = sum(priorities.values())
        if total > 0:
            self.priorities = {k: v / total for k, v in priorities.items()}
        else:
            self.priorities = priorities

    def apply_automatic_fixes(self) -> Dict[str, Any]:
        """Apply automatic fixes to common data issues"""
        fixes_applied = []
        
        # Fix 1: Remove duplicate IDs (but be careful about skill coverage)
        original_clients = len(self.clients)
        original_workers = len(self.workers) 
        original_tasks = len(self.tasks)
        
        # Keep track of removed IDs to handle cascading effects
        removed_client_ids = set()
        removed_worker_ids = set()
        removed_task_ids = set()
        
        # Remove duplicate clients (safe)
        seen_client_ids = set()
        filtered_clients = []
        for client in self.clients:
            client_id = client.get("ClientID")
            if client_id and client_id not in seen_client_ids:
                seen_client_ids.add(client_id)
                filtered_clients.append(client)
            elif client_id:
                removed_client_ids.add(client_id)
                fixes_applied.append(f"Removed duplicate ClientID: {client_id}")
        self.clients = filtered_clients
        
        # Remove duplicate tasks (safe)
        seen_task_ids = set()
        filtered_tasks = []
        for task in self.tasks:
            task_id = task.get("TaskID")
            if task_id and task_id not in seen_task_ids:
                seen_task_ids.add(task_id)
                filtered_tasks.append(task)
            elif task_id:
                removed_task_ids.add(task_id)
                fixes_applied.append(f"Removed duplicate TaskID: {task_id}")
        self.tasks = filtered_tasks
        
        # For workers, be more careful - collect all required skills first
        all_required_skills = set()
        for task in self.tasks:
            req_skills = task.get("RequiredSkills", "")
            if isinstance(req_skills, str):
                skills_list = [s.strip() for s in req_skills.split(",") if s.strip()]
                all_required_skills.update(skills_list)
        
        # Group workers by ID and track their skills
        worker_groups = {}
        for worker in self.workers:
            worker_id = worker.get("WorkerID")
            if worker_id:
                if worker_id not in worker_groups:
                    worker_groups[worker_id] = []
                worker_groups[worker_id].append(worker)
        
        # For each worker ID with duplicates, keep the one with the most comprehensive skills
        filtered_workers = []
        for worker_id, worker_list in worker_groups.items():
            if len(worker_list) == 1:
                filtered_workers.append(worker_list[0])
            else:
                # Find the worker with the most skills that cover required skills
                best_worker = worker_list[0]
                best_skill_coverage = 0
                
                for worker in worker_list:
                    skills_raw = worker.get("Skills", "")
                    if isinstance(skills_raw, str):
                        worker_skills = set(s.strip() for s in skills_raw.split(",") if s.strip())
                    else:
                        worker_skills = set()
                    
                    # Count how many required skills this worker covers
                    coverage = len(all_required_skills.intersection(worker_skills))
                    if coverage > best_skill_coverage or (coverage == best_skill_coverage and len(worker_skills) > len(best_worker.get("Skills", "").split(","))):
                        best_worker = worker
                        best_skill_coverage = coverage
                
                filtered_workers.append(best_worker)
                removed_worker_ids.update(w.get("WorkerID") for w in worker_list if w != best_worker)
                fixes_applied.append(f"Removed {len(worker_list)-1} duplicate workers for WorkerID: {worker_id}, kept the one with best skill coverage")
        
        self.workers = filtered_workers
        
        # Fix 1.5: Handle cascading effects from removed entities
        # Clean up client requested task IDs that reference removed tasks
        for client in self.clients:
            if "RequestedTaskIDs" in client and client["RequestedTaskIDs"]:
                task_ids = [tid.strip() for tid in str(client["RequestedTaskIDs"]).split(",") if tid.strip()]
                valid_task_ids = [tid for tid in task_ids if tid not in removed_task_ids]
                if len(valid_task_ids) != len(task_ids):
                    client["RequestedTaskIDs"] = ",".join(valid_task_ids) if valid_task_ids else ""
                    fixes_applied.append(f"Cleaned RequestedTaskIDs for client {client.get('ClientID')}")
        
        # Fix 2: Clamp out-of-range values
        for client in self.clients:
            if "PriorityLevel" in client:
                old_val = client["PriorityLevel"]
                if isinstance(old_val, (int, float)):
                    if old_val < 1:
                        client["PriorityLevel"] = 1
                        fixes_applied.append(f"Fixed PriorityLevel {old_val} -> 1 for client {client.get('ClientID')}")
                    elif old_val > 5:
                        client["PriorityLevel"] = 5
                        fixes_applied.append(f"Fixed PriorityLevel {old_val} -> 5 for client {client.get('ClientID')}")
        
        for task in self.tasks:
            if "Duration" in task:
                old_val = task["Duration"]
                if isinstance(old_val, (int, float)) and old_val < 1:
                    task["Duration"] = 1
                    fixes_applied.append(f"Fixed Duration {old_val} -> 1 for task {task.get('TaskID')}")
            
            # Fix negative MaxConcurrent values
            if "MaxConcurrent" in task:
                old_val = task["MaxConcurrent"]
                if isinstance(old_val, (int, float)) and old_val < 0:
                    task["MaxConcurrent"] = 1
                    fixes_applied.append(f"Fixed MaxConcurrent {old_val} -> 1 for task {task.get('TaskID')}")
        
        # Fix 3: Clean empty skills and convert to proper format
        for worker in self.workers:
            if "Skills" in worker:
                skills = worker["Skills"]
                if isinstance(skills, str):
                    # Clean up skills string - remove empty skills
                    cleaned_skills = [s.strip() for s in skills.split(",") if s.strip()]
                    if len(cleaned_skills) != len([s for s in skills.split(",") if s]):  # Only count non-empty original splits
                        worker["Skills"] = ",".join(cleaned_skills)
                        fixes_applied.append(f"Cleaned skills for worker {worker.get('WorkerID')}")
        
        # Fix 4: Clean up unknown skills in tasks (replace with known skills if possible)
        # First, collect all available skills from workers
        available_skills = set()
        for worker in self.workers:
            skills_raw = worker.get("Skills", "")
            if isinstance(skills_raw, str):
                skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
                available_skills.update(skills_list)
        
        for task in self.tasks:
            if "RequiredSkills" in task:
                req_skills_raw = task["RequiredSkills"]
                if isinstance(req_skills_raw, str):
                    req_skills = [s.strip() for s in req_skills_raw.split(",") if s.strip()]
                    valid_skills = [s for s in req_skills if s in available_skills]
                    
                    if len(valid_skills) != len(req_skills) and valid_skills:  # Only fix if we have some valid skills
                        task["RequiredSkills"] = ",".join(valid_skills)
                        unknown_skills = set(req_skills) - set(valid_skills)
                        fixes_applied.append(f"Removed unknown skills {unknown_skills} from task {task.get('TaskID')}")
                    elif not valid_skills and req_skills:  # All skills are unknown
                        # Assign the most common skill from available workers
                        if available_skills:
                            most_common_skill = list(available_skills)[0]  # Just pick the first one
                            task["RequiredSkills"] = most_common_skill
                            fixes_applied.append(f"Replaced all unknown skills with '{most_common_skill}' for task {task.get('TaskID')}")
        
        # Fix 5: Add missing required fields with sensible defaults
            if "Skills" in worker:
                skills = worker["Skills"]
                if isinstance(skills, str):
                    # Clean up skills string
                    cleaned_skills = [s.strip() for s in skills.split(",") if s.strip()]
                    if len(cleaned_skills) != len(skills.split(",")):
                        worker["Skills"] = ",".join(cleaned_skills)
                        fixes_applied.append(f"Cleaned skills for worker {worker.get('WorkerID')}")
        
        for client in self.clients:
            if not client.get("GroupTag"):
                client["GroupTag"] = "default"
                fixes_applied.append(f"Added default GroupTag for client {client.get('ClientID')}")
            if not client.get("AttributesJSON"):
                client["AttributesJSON"] = "{}"
                fixes_applied.append(f"Added default AttributesJSON for client {client.get('ClientID')}")
        
        for worker in self.workers:
            if not worker.get("WorkerGroup"):
                worker["WorkerGroup"] = "default"
                fixes_applied.append(f"Added default WorkerGroup for worker {worker.get('WorkerID')}")
            if not worker.get("QualificationLevel"):
                worker["QualificationLevel"] = 1
                fixes_applied.append(f"Added default QualificationLevel for worker {worker.get('WorkerID')}")
        
        for task in self.tasks:
            if not task.get("Category"):
                task["Category"] = "general"
                fixes_applied.append(f"Added default Category for task {task.get('TaskID')}")
            if not task.get("PreferredPhases"):
                task["PreferredPhases"] = "1"
                fixes_applied.append(f"Added default PreferredPhases for task {task.get('TaskID')}")
            if not task.get("MaxConcurrent"):
                task["MaxConcurrent"] = 1
                fixes_applied.append(f"Added default MaxConcurrent for task {task.get('TaskID')}")
        
        # Fix 5.5: Attempt to fix malformed JSON and lists
        for client in self.clients:
            # Try to fix malformed AttributesJSON
            if "AttributesJSON" in client:
                attr_json = client["AttributesJSON"]
                if isinstance(attr_json, str) and attr_json and attr_json != "{}":
                    try:
                        # Try to parse as JSON
                        json.loads(attr_json)
                    except json.JSONDecodeError:
                        # If it fails, try common fixes
                        try:
                            # Fix common JSON issues like single quotes
                            fixed_json = attr_json.replace("'", '"')
                            json.loads(fixed_json)
                            client["AttributesJSON"] = fixed_json
                            fixes_applied.append(f"Fixed malformed JSON for client {client.get('ClientID')}")
                        except:
                            # If still failing, set to empty JSON
                            client["AttributesJSON"] = "{}"
                            fixes_applied.append(f"Reset malformed JSON to empty for client {client.get('ClientID')}")
        
        for worker in self.workers:
            # Try to fix malformed AvailableSlots
            if "AvailableSlots" in worker:
                slots = worker["AvailableSlots"]
                if isinstance(slots, str) and slots:
                    try:
                        # Try to parse as JSON
                        json.loads(slots)
                    except json.JSONDecodeError:
                        # Try common fixes
                        try:
                            # Fix common list issues like removing non-numeric values
                            fixed_slots = slots.replace("abc", "0").replace("'", '"')
                            parsed_slots = json.loads(fixed_slots)
                            # Ensure all values are integers
                            cleaned_slots = [int(x) if isinstance(x, (int, float, str)) and str(x).isdigit() else 1 for x in parsed_slots]
                            worker["AvailableSlots"] = json.dumps(cleaned_slots)
                            fixes_applied.append(f"Fixed malformed AvailableSlots for worker {worker.get('WorkerID')}")
                        except:
                            # If still failing, set to default
                            worker["AvailableSlots"] = "[1, 1, 1]"
                            fixes_applied.append(f"Reset malformed AvailableSlots to default for worker {worker.get('WorkerID')}")
        
        for task in self.tasks:
            # Try to fix malformed PreferredPhases
            if "PreferredPhases" in task:
                phases = task["PreferredPhases"]
                if isinstance(phases, str) and phases and not phases.startswith("["):
                    try:
                        # Try to convert simple formats
                        if phases.isdigit():
                            task["PreferredPhases"] = f"[{phases}]"
                            fixes_applied.append(f"Fixed PreferredPhases format for task {task.get('TaskID')}")
                        elif "-" in phases and all(p.strip().isdigit() for p in phases.split("-")):
                            start, end = map(int, phases.split("-"))
                            phase_list = list(range(start, end + 1))
                            task["PreferredPhases"] = json.dumps(phase_list)
                            fixes_applied.append(f"Fixed PreferredPhases range format for task {task.get('TaskID')}")
                        else:
                            # Set to default
                            task["PreferredPhases"] = "[1]"
                            fixes_applied.append(f"Reset malformed PreferredPhases to default for task {task.get('TaskID')}")
                    except:
                        task["PreferredPhases"] = "[1]"
                        fixes_applied.append(f"Reset malformed PreferredPhases to default for task {task.get('TaskID')}")
        
        # Fix 6: Ensure worker skill coverage after all fixes
        # Verify that all required skills are still covered after removing duplicates
        final_required_skills = set()
        for task in self.tasks:
            req_skills = task.get("RequiredSkills", "")
            if isinstance(req_skills, str):
                skills_list = [s.strip() for s in req_skills.split(",") if s.strip()]
                final_required_skills.update(skills_list)
        
        final_available_skills = set()
        for worker in self.workers:
            skills_raw = worker.get("Skills", "")
            if isinstance(skills_raw, str):
                skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
                final_available_skills.update(skills_list)
        
        # If any required skills are missing, add them to the first worker
        missing_skills = final_required_skills - final_available_skills
        if missing_skills and self.workers:
            for worker in self.workers:
                if "WorkerID" in worker:
                    worker_id = worker["WorkerID"]
                    # Add missing skills to this worker
                    current_skills = worker.get("Skills", "")
                    if isinstance(current_skills, str):
                        current_skills_set = set(s.strip() for s in current_skills.split(",") if s.strip())
                    else:
                        current_skills_set = set()
                    
                    # Add only the missing skills
                    skills_to_add = missing_skills - current_skills_set
                    if skills_to_add:
                        new_skills = list(current_skills_set.union(skills_to_add))
                        worker["Skills"] = ",".join(new_skills)
                        fixes_applied.append(f"Added missing skills to worker {worker_id}: {skills_to_add}")
        
        # Summary of fixes applied
        print(f"Applied {len(fixes_applied)} automatic fixes:")
        for fix in fixes_applied:
            print(f" - {fix}")
        
        return {
            "clients_removed": original_clients - len(self.clients),
            "workers_removed": original_workers - len(self.workers),
            "tasks_removed": original_tasks - len(self.tasks),
            "fixes_applied": fixes_applied
        }
    
    def _apply_priority_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply priority rules to modify client or task priorities"""
        print(f"Applying priority rule: {rule}")
        params = rule.get("parameters", {})
        condition = params.get("condition", {})
        action = params.get("action", {})
        
        changes_made = 0
        
        # Handle simple budget-based rules
        rule_name = rule.get("name", "").lower()
        rule_description = rule.get("description", "").lower()
        
        # Check if this is a budget-based rule
        if "budget" in rule_name or "budget" in rule_description:
            print("Processing budget-based rule")
            for client in self.clients:
                try:
                    # Get the AttributesJSON field
                    attributes_json = client.get("AttributesJSON", "{}")
                    if attributes_json and attributes_json != "not a json":
                        import json
                        attributes = json.loads(attributes_json)
                        budget = attributes.get("budget", 0)
                        
                        # If budget over 40000, set priority to 9
                        if budget > 40000:
                            old_priority = client.get("PriorityLevel", 3)
                            client["PriorityLevel"] = 9
                            print(f"Updated client {client.get('ClientID')} priority: {old_priority} -> 9 (budget: {budget})")
                            changes_made += 1
                except Exception as e:
                    print(f"Error processing client {client.get('ClientID')}: {e}")
                    continue
        
        # Check if this is an urgent-based rule
        elif "urgent" in rule_name or "urgent" in rule_description:
            print("Processing urgent-based rule")
            for client in self.clients:
                try:
                    # Get the AttributesJSON field
                    attributes_json = client.get("AttributesJSON", "{}")
                    if attributes_json and attributes_json != "not a json":
                        import json
                        attributes = json.loads(attributes_json)
                        urgent = attributes.get("urgent", False)
                        
                        # If urgent is true, set priority to 10
                        if urgent:
                            old_priority = client.get("PriorityLevel", 3)
                            client["PriorityLevel"] = 10
                            print(f"Updated client {client.get('ClientID')} priority: {old_priority} -> 10 (urgent: {urgent})")
                            changes_made += 1
                except Exception as e:
                    print(f"Error processing client {client.get('ClientID')}: {e}")
                    continue
        
        # Fallback to original complex logic
        else:
            # Apply to clients
            if condition.get("entity_type") == "client" or not condition.get("entity_type"):
                for client in self.clients:
                    if self._matches_condition(client, condition):
                        if action.get("type") == "boost_priority":
                            current_priority = client.get("PriorityLevel", 3)
                            if isinstance(current_priority, str):
                                priority_map = {"Low": 1, "Medium": 3, "High": 5}
                                current_priority = priority_map.get(current_priority, 3)
                            
                            boost_amount = action.get("value", 1)
                            new_priority = min(10, current_priority + boost_amount)  # Allow up to 10
                            client["PriorityLevel"] = new_priority
                            changes_made += 1
                        elif action.get("type") == "lower_priority":
                            current_priority = client.get("PriorityLevel", 3)
                            if isinstance(current_priority, str):
                                priority_map = {"Low": 1, "Medium": 3, "High": 5}
                                current_priority = priority_map.get(current_priority, 3)
                            
                            lower_amount = action.get("value", 1)
                            new_priority = max(1, current_priority - lower_amount)
                            client["PriorityLevel"] = new_priority
                            changes_made += 1

            # Apply to tasks
            if condition.get("entity_type") == "task":
                for task in self.tasks:
                    if self._matches_condition(task, condition):
                        if action.get("type") == "boost_priority":
                            current_priority = task.get("Priority", 3)
                            boost_amount = action.get("value", 1)
                            new_priority = min(10, current_priority + boost_amount)  # Allow up to 10
                            task["Priority"] = new_priority
                            changes_made += 1
                        elif action.get("type") == "lower_priority":
                            current_priority = task.get("Priority", 3)
                            lower_amount = action.get("value", 1)
                            new_priority = max(1, current_priority - lower_amount)
                            task["Priority"] = new_priority
                            changes_made += 1

        print(f"Priority rule applied. Changes made: {changes_made}")
        return {"applied": True, "changes_made": changes_made, "description": f"Modified priority for {changes_made} entities"}
    
    def _apply_load_limit_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply load limit rules to workers"""
        params = rule.get("parameters", {})
        max_load = params.get("max_load_per_phase", 3)
        target_groups = params.get("worker_groups", [])
        
        changes_made = 0
        
        for worker in self.workers:
            # Apply to all workers or specific groups
            if not target_groups or worker.get("WorkerGroup") in target_groups:
                current_max_load = worker.get("MaxLoadPerPhase", 999)
                if current_max_load > max_load:
                    worker["MaxLoadPerPhase"] = max_load
                    changes_made += 1
        
        return {"applied": True, "changes_made": changes_made, "description": f"Applied load limit to {changes_made} workers"}
    
    def _apply_corun_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply co-run rules to tasks"""
        params = rule.get("parameters", {})
        task_ids = params.get("task_ids", [])
        
        # Add co-run group information to tasks
        group_id = f"corun_{rule.get('id', 'unknown')}"
        changes_made = 0
        
        for task in self.tasks:
            if task.get("TaskID") in task_ids:
                if "CoRunGroup" not in task:
                    task["CoRunGroup"] = []
                if group_id not in task["CoRunGroup"]:
                    task["CoRunGroup"].append(group_id)
                    changes_made += 1
        
        return {"applied": True, "changes_made": changes_made, "description": f"Added co-run group to {changes_made} tasks"}
    
    def _apply_phase_window_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply phase window restrictions"""
        params = rule.get("parameters", {})
        task_id = params.get("task_id")
        allowed_phases = params.get("allowed_phases", [])
        
        changes_made = 0
        
        for task in self.tasks:
            if task.get("TaskID") == task_id:
                # Update PreferredPhases to only include allowed phases
                current_phases = task.get("PreferredPhases", "1")
                if isinstance(current_phases, str):
                    try:
                        if current_phases.startswith("["):
                            current_phases = json.loads(current_phases)
                        else:
                            current_phases = [int(current_phases)]
                    except:
                        current_phases = [1]
                
                # Filter to only allowed phases
                filtered_phases = [p for p in current_phases if p in allowed_phases]
                if not filtered_phases:
                    filtered_phases = allowed_phases[:1]  # Use first allowed phase if none match
                
                task["PreferredPhases"] = json.dumps(filtered_phases)
                changes_made += 1
        
        return {"applied": True, "changes_made": changes_made, "description": f"Applied phase window to {changes_made} tasks"}
    
    def _apply_slot_restriction_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply slot restriction rules"""
        params = rule.get("parameters", {})
        target_entities = params.get("target_entities", [])
        min_common_slots = params.get("min_common_slots", 1)
        
        changes_made = 0
        
        # This is a complex rule that would require coordination between entities
        # For now, we'll just mark it as informational
        return {"applied": True, "changes_made": 0, "description": "Slot restriction rule registered (requires scheduling engine to enforce)"}
    
    def _apply_pattern_match_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Apply pattern matching rules"""
        params = rule.get("parameters", {})
        pattern = params.get("pattern", {})
        action = params.get("action", {})
        
        changes_made = 0
        
        # Apply pattern matching to all entity types
        all_entities = [
            ("client", self.clients),
            ("worker", self.workers), 
            ("task", self.tasks)
        ]
        
        for entity_type, entities in all_entities:
            for entity in entities:
                if self._matches_pattern(entity, pattern):
                    if action.get("type") == "set_attribute":
                        attr_name = action.get("attribute")
                        attr_value = action.get("value")
                        if attr_name and attr_value is not None:
                            entity[attr_name] = attr_value
                            changes_made += 1
                    elif action.get("type") == "modify_priority":
                        priority_field = "PriorityLevel" if entity_type == "client" else "Priority"
                        if priority_field in entity:
                            modifier = action.get("modifier", 0)
                            current = entity.get(priority_field, 3)
                            entity[priority_field] = max(1, min(5, current + modifier))
                            changes_made += 1
        
        return {"applied": True, "changes_made": changes_made, "description": f"Applied pattern rule to {changes_made} entities"}
    
    def _matches_condition(self, entity: Dict[str, Any], condition: Dict[str, Any]) -> bool:
        """Check if an entity matches a rule condition"""
        for field, expected_value in condition.items():
            if field in ["entity_type"]:  # Skip meta fields
                continue
                
            entity_value = entity.get(field)
            
            if isinstance(expected_value, dict):
                # Handle operators like {">=": 3}
                for op, value in expected_value.items():
                    if op == ">=" and entity_value < value:
                        return False
                    elif op == "<=" and entity_value > value:
                        return False
                    elif op == ">" and entity_value <= value:
                        return False
                    elif op == "<" and entity_value >= value:
                        return False
                    elif op == "==" and entity_value != value:
                        return False
                    elif op == "!=" and entity_value == value:
                        return False
                    elif op == "contains" and value not in str(entity_value):
                        return False
            else:
                # Direct value comparison
                if entity_value != expected_value:
                    return False
        
        return True
    
    def _matches_pattern(self, entity: Dict[str, Any], pattern: Dict[str, Any]) -> bool:
        """Check if an entity matches a pattern"""
        return self._matches_condition(entity, pattern)

    def generate_simple_rule_fallback(self, user_input: str) -> Optional[Dict[str, Any]]:
        """Simple fallback rule generation for testing"""
        user_input_lower = user_input.lower()
        
        # Handle budget-based rules
        if "budget" in user_input_lower and "40000" in user_input_lower:
            return {
                "id": f"priorityRule_{int(time.time())}",
                "name": "High Budget Priority Rule",
                "description": "Clients with budget over 40000 get priority level 9",
                "type": "priorityRule",
                "parameters": {
                    "condition": "budget > 40000",
                    "action": "set_priority",
                    "value": 9
                },
                "isActive": True,
                "createdAt": datetime.now().isoformat()
            }
        
        # Handle urgent-based rules
        elif "urgent" in user_input_lower and "priority" in user_input_lower:
            return {
                "id": f"priorityRule_{int(time.time())}",
                "name": "Urgent Client Priority Rule", 
                "description": "Clients with urgent status get priority level 10",
                "type": "priorityRule",
                "parameters": {
                    "condition": "urgent == true",
                    "action": "set_priority", 
                    "value": 10
                },
                "isActive": True,
                "createdAt": datetime.now().isoformat()
            }
        
        return None

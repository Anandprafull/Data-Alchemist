# main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import pandas as pd
import os
import math
import json
from backend import DataManager

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Save uploaded file
# UPLOAD_DIR = "uploads"  # No longer needed
# os.makedirs(UPLOAD_DIR, exist_ok=True)  # No longer needed

# File storage is no longer used - processing files in memory only
# CURRENT_FILES_PATH = "current_files.json"  # Deprecated

# Global DataManager instance to persist data across requests
global_data_manager = None

def get_or_create_data_manager():
    """Get the global data manager"""
    global global_data_manager
    
    if global_data_manager is not None:
        return global_data_manager
    
    # Note: Since we no longer save files to disk, we cannot reload data after server restart
    # Users will need to re-upload their files
    print("ℹ️  No data loaded. Please upload CSV files through the frontend.")
    return None

def save_current_files(clients_path, workers_path, tasks_path):
    """Save the current file paths for reloading after server restart"""
    # Note: This function is now deprecated since we no longer save files to disk
    # Keeping for backward compatibility but will not be used for in-memory processing
    print("ℹ️  File paths are no longer saved since files are processed in memory only.")
    pass

# Deprecated - no longer saving files to disk
def save_upload_file(upload_file: UploadFile) -> str:
    """Legacy function - no longer used as we process files in memory"""
    pass

# Endpoint to accept files from frontend
@app.post("/upload")
async def upload_files(
    clients: UploadFile = File(...),
    workers: UploadFile = File(...),
    tasks: UploadFile = File(...)
):
    try:
        print("Starting file upload process (in-memory)...")
        print("ℹ️  Files will be processed in memory only - no files saved to disk")
        
        # Reset file position to beginning for each file
        clients.file.seek(0)
        workers.file.seek(0)
        tasks.file.seek(0)
        
        print("Initializing DataManager...")
        global global_data_manager
        global_data_manager = DataManager()
        dm = global_data_manager
        print("DataManager initialized successfully")
        
        print("Loading files from memory...")
        # Load files directly from file objects without saving to disk
        try:
            dm.load_files_from_objects(clients.file, workers.file, tasks.file)
        except Exception as e:
            print(f"Error loading files from memory: {e}")
            return JSONResponse(
                status_code=400, 
                content={
                    "status": "error", 
                    "message": f"Failed to process uploaded files: {str(e)}"
                }
            )
        print(f"Files loaded - Clients: {len(dm.clients)}, Workers: {len(dm.workers)}, Tasks: {len(dm.tasks)}")

        # Note: We no longer save file paths since files aren't saved to disk
        # The data will need to be re-uploaded after server restart

        # Check if data loaded successfully
        if not dm.clients and not dm.workers and not dm.tasks:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Failed to load data from files"})

        print("Running validation...")
        validation_errors = dm.validate_all()
        print(f"Validation completed - Found {len(validation_errors)} errors")
        
        # Clean validation errors for JSON serialization
        cleaned_errors = []
        for error in validation_errors:
            error_dict = error.to_dict()
            # Ensure all values in error_dict are JSON serializable
            cleaned_error = {}
            for key, value in error_dict.items():
                if isinstance(value, dict):
                    # Clean nested dictionaries
                    cleaned_value = {}
                    for k, v in value.items():
                        if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                            cleaned_value[k] = None
                        else:
                            cleaned_value[k] = v
                    cleaned_error[key] = cleaned_value
                elif pd.isna(value) or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
                    cleaned_error[key] = None
                else:
                    cleaned_error[key] = value
            cleaned_errors.append(cleaned_error)
        
        # Return the actual data along with validation errors
        return {
            "status": "success", 
            "errors": cleaned_errors,
            "data": {
                "clients": dm.clients,
                "workers": dm.workers,
                "tasks": dm.tasks,
            },
            "summary": {
                "total_clients": len(dm.clients),
                "total_workers": len(dm.workers),
                "total_tasks": len(dm.tasks),
                "error_count": len(validation_errors)
            }
        }

    except Exception as e:
        print(f"Error in upload endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Natural language search
@app.post("/nl_search")
async def nl_search(query: str = Form(...)):
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        results = dm.natural_language_search(query)
        return {"status": "success", "results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Natural language modify
@app.post("/nl_modify")
async def nl_modify(command: str = Form(...)):
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        updated_data = dm.natural_language_modify(command)
        return {"status": "success", "updated": updated_data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Row correction suggestions
@app.get("/suggest_corrections")
async def suggest_corrections():
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        # For now, return validation errors as suggestions
        validation_errors = dm.validate_all()
        suggestions = [{"error": error.to_dict(), "suggestion": f"Fix {error.error_type}: {error.message}"} for error in validation_errors]
        return {"status": "success", "suggestions": suggestions}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# AI Rule Recommendations
@app.post("/ai_rule_recommendations")
async def ai_rule_recommendations(request: dict = None):
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        rule_suggestions = dm.get_recommended_rules()
        return {"status": "success", "rules": rule_suggestions}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# AI Rule Generation from Natural Language
@app.post("/ai_generate_rule")
async def ai_generate_rule(request: dict):
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        user_input = request.get("input", "")
        if not user_input:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No input provided"})
        
        generated_rule = dm.generate_rule_from_natural_language(user_input)
        if generated_rule:
            return {"status": "success", "rule": generated_rule}
        else:
            return {"status": "error", "message": "Failed to generate rule from input"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Apply automatic corrections
@app.post("/apply_corrections")
async def apply_corrections():
    try:
        print("=== APPLY CORRECTIONS ENDPOINT CALLED ===")
        
        dm = get_or_create_data_manager()
        if not dm:
            print("❌ No data manager found and no files to reload")
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        print(f"✅ Using data manager with {len(dm.clients)} clients, {len(dm.workers)} workers, {len(dm.tasks)} tasks")
        
        # Get validation errors
        validation_errors = dm.validate_all()
        print(f"🔍 Found {len(validation_errors)} validation errors")
        for i, error in enumerate(validation_errors[:5]):  # Show first 5 errors
            print(f"  Error {i+1}: {error.error_type} - {error.message}")
        if len(validation_errors) > 5:
            print(f"  ... and {len(validation_errors) - 5} more errors")
        
        if not validation_errors:
            print("ℹ️ No errors to fix, returning current data")
            return {"status": "success", "message": "No errors to fix", "data": {
                "clients": dm.clients,
                "workers": dm.workers, 
                "tasks": dm.tasks,
            }, "summary": {
                "total_clients": len(dm.clients),
                "total_workers": len(dm.workers),
                "total_tasks": len(dm.tasks),
                "error_count": 0,
                "errors_fixed": 0
            }}
        
        # Apply automatic fixes for common issues
        print(f"Before fixes - Clients: {len(dm.clients)}, Workers: {len(dm.workers)}, Tasks: {len(dm.tasks)}")
        fixed_data = dm.apply_automatic_fixes()
        print(f"After fixes - Clients: {len(dm.clients)}, Workers: {len(dm.workers)}, Tasks: {len(dm.tasks)}")
        
        # Re-run validation to see if errors were fixed
        new_validation_errors = dm.validate_all()
        print(f"🔍 After fixes: Found {len(new_validation_errors)} validation errors")
        for i, error in enumerate(new_validation_errors[:5]):  # Show first 5 errors
            print(f"  Error {i+1}: {error.error_type} - {error.message}")
        if len(new_validation_errors) > 5:
            print(f"  ... and {len(new_validation_errors) - 5} more errors")
        print(f"🔍 After fixes: Found {len(new_validation_errors)} validation errors")
        for i, error in enumerate(new_validation_errors[:5]):  # Show first 5 errors
            print(f"  Error {i+1}: {error.error_type} - {error.message}")
        if len(new_validation_errors) > 5:
            print(f"  ... and {len(new_validation_errors) - 5} more errors")
        
        # Clean validation errors for JSON serialization
        cleaned_errors = []
        for error in new_validation_errors:
            error_dict = error.to_dict()
            # Ensure all values in error_dict are JSON serializable
            cleaned_error = {}
            for key, value in error_dict.items():
                if isinstance(value, dict):
                    # Clean nested dictionaries
                    cleaned_value = {}
                    for k, v in value.items():
                        if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                            cleaned_value[k] = None
                        else:
                            cleaned_value[k] = v
                    cleaned_error[key] = cleaned_value
                elif pd.isna(value) or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
                    cleaned_error[key] = None
                else:
                    cleaned_error[key] = value
            cleaned_errors.append(cleaned_error)
        
        print(f"📊 Final data counts - Clients: {len(dm.clients)}, Workers: {len(dm.workers)}, Tasks: {len(dm.tasks)}")
        print(f"🔍 Sample client data: {dm.clients[:1] if dm.clients else 'No clients'}")
        
        response_data = {
            "status": "success", 
            "message": f"Applied fixes. Errors reduced from {len(validation_errors)} to {len(new_validation_errors)}",
            "errors": cleaned_errors,
            "data": {
                "clients": dm.clients,
                "workers": dm.workers,
                "tasks": dm.tasks,
            },
            "summary": {
                "total_clients": len(dm.clients),
                "total_workers": len(dm.workers),
                "total_tasks": len(dm.tasks),
                "error_count": len(new_validation_errors),
                "errors_fixed": len(validation_errors) - len(new_validation_errors)
            }
        }
        
        print("📤 Sending response back to frontend")
        return response_data
        
    except Exception as e:
        print(f"Error in apply_corrections endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Export processed data
@app.post("/export")
async def export_data():
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        print("🗂️ Starting data export...")
        
        # Use the export_all method from DataManager
        output_dir = dm.export_all("exports")
        
        print(f"✅ Data exported to: {output_dir}")
        
        # Get file paths for the exported files
        clients_file = os.path.join(output_dir, "clients.csv")
        workers_file = os.path.join(output_dir, "workers.csv")
        tasks_file = os.path.join(output_dir, "tasks.csv")
        rules_file = os.path.join(output_dir, "rules.json")
        priorities_file = os.path.join(output_dir, "priorities.json")
        
        # Check which files were actually created
        exported_files = []
        if os.path.exists(clients_file):
            exported_files.append({"name": "clients.csv", "path": clients_file, "type": "csv"})
        if os.path.exists(workers_file):
            exported_files.append({"name": "workers.csv", "path": workers_file, "type": "csv"})
        if os.path.exists(tasks_file):
            exported_files.append({"name": "tasks.csv", "path": tasks_file, "type": "csv"})
        if os.path.exists(rules_file):
            exported_files.append({"name": "rules.json", "path": rules_file, "type": "json"})
        if os.path.exists(priorities_file):
            exported_files.append({"name": "priorities.json", "path": priorities_file, "type": "json"})
        
        return {
            "status": "success",
            "message": f"Data exported successfully to {output_dir}",
            "export_directory": output_dir,
            "files": exported_files,
            "summary": {
                "total_files": len(exported_files),
                "clients_count": len(dm.clients),
                "workers_count": len(dm.workers),
                "tasks_count": len(dm.tasks),
                "rules_count": len(dm.rules) if hasattr(dm, 'rules') else 0
            }
        }
        
    except Exception as e:
        print(f"Error in export endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Download individual exported files
@app.get("/download/{filename}")
async def download_file(filename: str):
    try:
        file_path = os.path.join("exports", filename)
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"status": "error", "message": "File not found"})
        
        return FileResponse(
            path=file_path,
            media_type='application/octet-stream',
            filename=filename
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Export and download data directly
@app.post("/export_download")
async def export_download():
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        print("🗂️ Preparing data for direct download...")
        
        # Create data for each file type
        files_data = []
        
        # Clients CSV
        if dm.clients:
            clients_df = pd.DataFrame(dm.clients)
            clients_csv = clients_df.to_csv(index=False)
            files_data.append({
                "name": "clients.csv",
                "content": clients_csv,
                "type": "text/csv",
                "size": len(clients_csv.encode('utf-8'))
            })
        
        # Workers CSV  
        if dm.workers:
            workers_df = pd.DataFrame(dm.workers)
            workers_csv = workers_df.to_csv(index=False)
            files_data.append({
                "name": "workers.csv", 
                "content": workers_csv,
                "type": "text/csv",
                "size": len(workers_csv.encode('utf-8'))
            })
            
        # Tasks CSV
        if dm.tasks:
            tasks_df = pd.DataFrame(dm.tasks)
            tasks_csv = tasks_df.to_csv(index=False)
            files_data.append({
                "name": "tasks.csv",
                "content": tasks_csv, 
                "type": "text/csv",
                "size": len(tasks_csv.encode('utf-8'))
            })
            
        # Rules JSON
        if hasattr(dm, 'rules') and dm.rules:
            rules_json = json.dumps(dm.rules, indent=2)
            files_data.append({
                "name": "rules.json",
                "content": rules_json,
                "type": "application/json", 
                "size": len(rules_json.encode('utf-8'))
            })
            
        # Priorities JSON
        if hasattr(dm, 'priorities') and dm.priorities:
            priorities_json = json.dumps(dm.priorities, indent=2)
            files_data.append({
                "name": "priorities.json",
                "content": priorities_json,
                "type": "application/json",
                "size": len(priorities_json.encode('utf-8'))
            })
        
        print(f"✅ Prepared {len(files_data)} files for download")
        
        return {
            "status": "success",
            "message": f"Prepared {len(files_data)} files for download",
            "files": files_data,
            "summary": {
                "total_files": len(files_data),
                "clients_count": len(dm.clients),
                "workers_count": len(dm.workers), 
                "tasks_count": len(dm.tasks),
                "rules_count": len(dm.rules) if hasattr(dm, 'rules') else 0
            }
        }
        
    except Exception as e:
        print(f"Error in export_download endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Apply Rules to Data
@app.post("/apply_rules")
async def apply_rules(request: dict):
    try:
        dm = get_or_create_data_manager()
        if not dm:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data loaded. Please upload files first."})
        
        rules = request.get("rules", [])
        if not rules:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No rules provided"})
        
        # Apply the rules to the data
        applied_results = dm.apply_rules_to_data(rules)
        
        return {
            "status": "success", 
            "message": f"Applied {len(rules)} rules to data",
            "results": applied_results,
            "data": {
                "clients": dm.clients,
                "workers": dm.workers,
                "tasks": dm.tasks,
            }
        }
    except Exception as e:
        print(f"Error in apply_rules endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
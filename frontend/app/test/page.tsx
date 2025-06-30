"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testBackendConnection = async () => {
    setIsLoading(true);
    const results: any[] = [];

    // Test 1: Basic connection to FastAPI
    try {
      const response = await fetch("https://data-alchemist-p7gh.onrender.com/docs");
      results.push({
        test: "FastAPI Docs Access",
        status: response.ok ? "✅ SUCCESS" : "❌ FAILED",
        message: response.ok
          ? "FastAPI is running and accessible"
          : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({
        test: "FastAPI Docs Access",
        status: "❌ FAILED",
        message: "Cannot connect to FastAPI server",
      });
    }

    // Test 2: Natural Language Search endpoint
    try {
      const formData = new FormData();
      formData.append("query", "test query");

      const response = await fetch("https://data-alchemist-p7gh.onrender.com/nl_search", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      results.push({
        test: "Natural Language Search",
        status: response.ok ? "✅ SUCCESS" : "❌ FAILED",
        message: response.ok
          ? `Response: ${JSON.stringify(result)}`
          : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({
        test: "Natural Language Search",
        status: "❌ FAILED",
        message: `Error: ${error}`,
      });
    }

    // Test 3: AI Rule Recommendations endpoint
    try {
      const response = await fetch(
        "https://data-alchemist-p7gh.onrender.com/ai_rule_recommendations",
        {
          method: "GET",
        }
      );

      const result = await response.json();
      results.push({
        test: "AI Rule Recommendations",
        status: response.ok ? "✅ SUCCESS" : "❌ FAILED",
        message: response.ok
          ? `Response: ${JSON.stringify(result)}`
          : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({
        test: "AI Rule Recommendations",
        status: "❌ FAILED",
        message: `Error: ${error}`,
      });
    }

    // Test 4: Suggest Corrections endpoint
    try {
      const response = await fetch(
        "https://data-alchemist-p7gh.onrender.com/suggest_corrections",
        {
          method: "GET",
        }
      );

      const result = await response.json();
      results.push({
        test: "Suggest Corrections",
        status: response.ok ? "✅ SUCCESS" : "❌ FAILED",
        message: response.ok
          ? `Response: ${JSON.stringify(result)}`
          : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({
        test: "Suggest Corrections",
        status: "❌ FAILED",
        message: `Error: ${error}`,
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Backend Connection Test</h1>
        <p className="text-muted-foreground">
          Test the connection between your Next.js frontend and FastAPI backend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FastAPI Backend Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testBackendConnection}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Testing..." : "Test Backend Connection"}
          </Button>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <div className="font-medium">
                    {result.test}: {result.status}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Make sure your FastAPI server is running at{" "}
              <code>https://data-alchemist-p7gh.onrender.com</code>
            </li>
            <li>Click the "Test Backend Connection" button above</li>
            <li>Check the results to see which endpoints are working</li>
            <li>
              If tests fail, check that your FastAPI server is running and all
              endpoints are implemented
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

"use client"

import { useState } from "react"
import { GripVertical, RotateCcw, Target, TrendingUp, Users, Clock, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import type { ProcessedData } from "@/lib/sample-data"

interface PrioritizationSectionProps {
  data?: ProcessedData | null
  onDataUpdate?: (updatedData: ProcessedData) => void
}

export default function PrioritizationSection({ data, onDataUpdate }: PrioritizationSectionProps) {
  const [weights, setWeights] = useState({
    priorityLevel: [70],
    requestedTasks: [60],
    fairDistribution: [50],
    taskUrgency: [80],
  })

  const [rankingItems, setRankingItems] = useState([
    { id: 1, name: "High Priority Clients", score: 95, icon: Users, color: "bg-blue-500" },
    { id: 2, name: "Task Urgency", score: 88, icon: Clock, color: "bg-red-500" },
    { id: 3, name: "Fair Distribution", score: 75, icon: TrendingUp, color: "bg-green-500" },
    { id: 4, name: "Requested Task IDs", score: 65, icon: Target, color: "bg-purple-500" },
  ])

  const resetWeights = () => {
    setWeights({
      priorityLevel: [70],
      requestedTasks: [60],
      fairDistribution: [50],
      taskUrgency: [80],
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Prioritization
          </h2>
          <p className="text-muted-foreground">Configure priority weights and ranking for resource allocation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Smart Balance
          </Badge>
          <Button variant="outline" size="sm" onClick={resetWeights}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sliders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/30">
          <TabsTrigger value="sliders" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Weight Sliders
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag & Drop Ranking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sliders">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/40 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-black dark:bg-white dark:text-black text-white">
                    <Sliders className="h-4 w-4" />
                  </div>
                  Priority Weights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label className="flex justify-between text-base font-medium">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Priority Level
                    </span>
                    <span className="text-blue-600 font-bold">{weights.priorityLevel[0]}%</span>
                  </Label>
                  <Slider
                    value={weights.priorityLevel}
                    onValueChange={(value) => setWeights((prev) => ({ ...prev, priorityLevel: value }))}
                    max={100}
                    step={5}
                    className="mt-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    How much to favor high-priority clients
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label className="flex justify-between text-base font-medium">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Requested Task IDs
                    </span>
                    <span className="text-purple-600 font-bold">{weights.requestedTasks[0]}%</span>
                  </Label>
                  <Slider
                    value={weights.requestedTasks}
                    onValueChange={(value) => setWeights((prev) => ({ ...prev, requestedTasks: value }))}
                    max={100}
                    step={5}
                    className="mt-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Preference for specifically requested tasks
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label className="flex justify-between text-base font-medium">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Fair Distribution
                    </span>
                    <span className="text-green-600 font-bold">{weights.fairDistribution[0]}%</span>
                  </Label>
                  <Slider
                    value={weights.fairDistribution}
                    onValueChange={(value) => setWeights((prev) => ({ ...prev, fairDistribution: value }))}
                    max={100}
                    step={5}
                    className="mt-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Balance workload across all workers
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label className="flex justify-between text-base font-medium">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      Task Urgency
                    </span>
                    <span className="text-red-600 font-bold">{weights.taskUrgency[0]}%</span>
                  </Label>
                  <Slider
                    value={weights.taskUrgency}
                    onValueChange={(value) => setWeights((prev) => ({ ...prev, taskUrgency: value }))}
                    max={100}
                    step={5}
                    className="mt-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Prioritize time-sensitive tasks
                  </p>
                </motion.div>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-black dark:bg-white dark:text-black text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  Weight Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round((weights.priorityLevel[0] + weights.requestedTasks[0] + weights.fairDistribution[0] + weights.taskUrgency[0]) / 4)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Average Weight</div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: "Priority Level", value: weights.priorityLevel[0], color: "bg-blue-500", icon: Users },
                      { name: "Task Urgency", value: weights.taskUrgency[0], color: "bg-red-500", icon: Clock },
                      { name: "Requested Tasks", value: weights.requestedTasks[0], color: "bg-purple-500", icon: Target },
                      { name: "Fair Distribution", value: weights.fairDistribution[0], color: "bg-green-500", icon: TrendingUp },
                    ]
                      .sort((a, b) => b.value - a.value)
                      .map((item, index) => {
                        const Icon = item.icon
                        return (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <Badge variant="secondary">{item.value}%</Badge>
                          </motion.div>
                        )
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ranking">
          <Card className="border-border/40 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <GripVertical className="h-4 w-4" />
                </div>
                Priority Ranking
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {rankingItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-move"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className={`p-2 rounded-lg ${item.color} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Priority score: {item.score}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.color} transition-all duration-300`}
                            style={{ width: `${item.score}%` }}
                          ></div>
                        </div>
                        <Badge variant="outline">{item.score}%</Badge>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Drag items to reorder them by priority. Higher positioned items will be given more weight in the allocation algorithm.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

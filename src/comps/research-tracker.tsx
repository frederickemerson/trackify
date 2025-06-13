"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Clock, FileText, Plus, BookOpen, Archive, ArrowRight, ExternalLink } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Badge } from "~/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"

interface Paper {
  id: string
  name: string
  pdfLink: string
  deadline: string
  status: "current" | "future" | "completed" | "missed"
  summary?: string
  reviewFile?: { name: string; url: string; type: string }
  dateAdded: string
}

const cardColors = [
  "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
  "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
  "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
  "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
  "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200",
  "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200",
]

const getCardColor = (index: number) => cardColors[index % cardColors.length]

export default function Component() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [newPaper, setNewPaper] = useState({
    name: "",
    pdfLink: "",
    deadline: "",
  })
  const [summaryDialog, setSummaryDialog] = useState<{ open: boolean; paper: Paper | null }>({
    open: false,
    paper: null,
  })
  const [summary, setSummary] = useState("")
  const [reviewFile, setReviewFile] = useState<File | null>(null)
  const [addDialog, setAddDialog] = useState(false)

  useEffect(() => {
    checkAndUpdateMissedPapers()
    // Check every hour for missed papers
    const interval = setInterval(checkAndUpdateMissedPapers, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const addPaper = (storeForFuture = false) => {
    if (!newPaper.name || !newPaper.pdfLink || !newPaper.deadline) return

    const paper: Paper = {
      id: Date.now().toString(),
      name: newPaper.name,
      pdfLink: newPaper.pdfLink,
      deadline: newPaper.deadline,
      status: storeForFuture ? "future" : "current",
      dateAdded: new Date().toISOString().split("T")[0] ?? "",
    }

    setPapers([...papers, paper])
    setNewPaper({ name: "", pdfLink: "", deadline: "" })
    setAddDialog(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (
      file &&
      (file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain")
    ) {
      setReviewFile(file)
    }
  }

  const completePaper = () => {
    if (!summaryDialog.paper || (!summary.trim() && !reviewFile)) return

    let reviewFileData = null
    if (reviewFile) {
      const url = URL.createObjectURL(reviewFile)
      reviewFileData = {
        name: reviewFile.name,
        url: url,
        type: reviewFile.type,
      }
    }

    setPapers(
      papers.map((paper) =>
        paper.id === summaryDialog.paper!.id
          ? {
              ...paper,
              status: "completed" as const,
              summary: summary.trim() ?? undefined,
              reviewFile: reviewFileData ?? undefined,
            }
          : paper,
      ),
    )

    setSummary("")
    setReviewFile(null)
    setSummaryDialog({ open: false, paper: null })
  }

  const moveToFuture = (paperId: string) => {
    setPapers(papers.map((paper) => (paper.id === paperId ? { ...paper, status: "future" as const } : paper)))
  }

  const moveToCurrentReview = (paperId: string) => {
    setPapers(papers.map((paper) => (paper.id === paperId ? { ...paper, status: "current" as const } : paper)))
  }

  const moveBackToCurrent = (paperId: string) => {
    setPapers(papers.map((paper) => (paper.id === paperId ? { ...paper, status: "current" as const } : paper)))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") return "📄"
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "📝"
    if (fileType === "text/plain") return "📃"
    return "📎"
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  const isMoreThanWeekOverdue = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const weekAfterDeadline = new Date(deadlineDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    return new Date() > weekAfterDeadline
  }

  const checkAndUpdateMissedPapers = () => {
    setPapers((prevPapers) =>
      prevPapers.map((paper) =>
        paper.status === "current" && isMoreThanWeekOverdue(paper.deadline)
          ? { ...paper, status: "missed" as const }
          : paper,
      ),
    )
  }

  const currentPapers = papers.filter((p) => p.status === "current")
  const futurePapers = papers.filter((p) => p.status === "future")
  const completedPapers = papers.filter((p) => p.status === "completed")
  const missedPapers = papers.filter((p) => p.status === "missed")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Research Paper Tracker</h1>
            <p className="text-gray-600 mt-1">Manage your paper reviews and deadlines</p>
          </div>
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Paper
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Research Paper</DialogTitle>
                <DialogDescription>Add a new research paper to track for review</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paper-name">Paper Name</Label>
                  <Input
                    id="paper-name"
                    placeholder="Enter paper title"
                    value={newPaper.name}
                    onChange={(e) => setNewPaper({ ...newPaper, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pdf-link">PDF Link</Label>
                  <Input
                    id="pdf-link"
                    placeholder="https://example.com/paper.pdf"
                    value={newPaper.pdfLink}
                    onChange={(e) => setNewPaper({ ...newPaper, pdfLink: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Review Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newPaper.deadline}
                    onChange={(e) => setNewPaper({ ...newPaper, deadline: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => addPaper(true)} className="w-full sm:w-auto">
                  <Archive className="w-4 h-4 mr-2" />
                  Store for Future
                </Button>
                <Button onClick={() => addPaper(false)} className="w-full sm:w-auto">
                  Add for Current Review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="current" className="flex items-center gap-2 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Current</span> ({currentPapers.length})
            </TabsTrigger>
            <TabsTrigger value="future" className="flex items-center gap-2 text-xs sm:text-sm">
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Future</span> ({futurePapers.length})
            </TabsTrigger>
            <TabsTrigger value="missed" className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Missed</span> ({missedPapers.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Completed</span> ({completedPapers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {currentPapers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No papers currently under review</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {currentPapers.map((paper, index) => (
                  <Card
                    key={paper.id}
                    className={`${getCardColor(index)} border-2 hover:shadow-lg transition-all duration-200`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                            {paper.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            Review deadline approaching
                          </CardDescription>
                        </div>
                        {isOverdue(paper.deadline) && (
                          <Badge variant="destructive" className="ml-2 shrink-0">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-white/60">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(paper.deadline)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-white/60">
                          PDF Available
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                        >
                          <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View PDF
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveToFuture(paper.id)}
                          className="justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Store Later
                        </Button>
                      </div>

                      <Button
                        onClick={() => setSummaryDialog({ open: true, paper })}
                        className="w-full justify-between bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Complete Review
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="future" className="space-y-4">
            {futurePapers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Archive className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No papers stored for future review</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {futurePapers.map((paper, index) => (
                  <Card
                    key={paper.id}
                    className={`${getCardColor(index)} border-2 hover:shadow-lg transition-all duration-200`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                        {paper.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">Stored for future review</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-white/60">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(paper.deadline)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-white/60">
                          Future Review
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="w-full justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                      >
                        <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View PDF
                        </a>
                      </Button>

                      <Button
                        onClick={() => moveToCurrentReview(paper.id)}
                        className="w-full justify-between bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Move to Current
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="missed" className="space-y-4">
            {missedPapers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No missed reviews</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {missedPapers.map((paper, index) => (
                  <Card
                    key={paper.id}
                    className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 hover:shadow-lg transition-all duration-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-lg font-bold text-red-900 leading-tight line-clamp-2">
                            {paper.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-red-700">Review deadline missed</CardDescription>
                        </div>
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          Missed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-white/60 text-red-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Was: {formatDate(paper.deadline)}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                        >
                          <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View PDF
                          </a>
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveToFuture(paper.id)}
                            className="flex-1 bg-white/60 hover:bg-white/80 text-gray-700"
                          >
                            Store Later
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveBackToCurrent(paper.id)}
                            className="flex-1 bg-white/60 hover:bg-white/80 text-gray-700"
                          >
                            Resume
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={() => setSummaryDialog({ open: true, paper })}
                        className="w-full justify-between bg-red-700 hover:bg-red-800 text-white"
                      >
                        Complete Review
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {completedPapers.map((paper, index) => (
                <Card
                  key={paper.id}
                  className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-lg font-bold text-green-900 leading-tight line-clamp-2">
                          {paper.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-green-700">
                          Review completed successfully
                        </CardDescription>
                      </div>
                      <Badge className="ml-2 shrink-0 bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs bg-white/60 text-green-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(paper.deadline)}
                      </Badge>
                      {paper.reviewFile && (
                        <Badge variant="secondary" className="text-xs bg-white/60 text-green-800">
                          {getFileIcon(paper.reviewFile.type)} Review File
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                      >
                        <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Original PDF
                        </a>
                      </Button>
                      {paper.reviewFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="justify-start bg-white/60 hover:bg-white/80 text-gray-700"
                        >
                          <a href={paper.reviewFile.url} target="_blank" rel="noopener noreferrer">
                            {getFileIcon(paper.reviewFile.type)} Review File
                          </a>
                        </Button>
                      )}
                    </div>

                    {paper.summary && (
                      <div className="bg-white/60 p-3 rounded-lg">
                        <Label className="text-xs font-medium text-green-900 uppercase tracking-wide">Summary</Label>
                        <p className="text-sm text-green-800 mt-1 line-clamp-3">{paper.summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog
          open={summaryDialog.open}
          onOpenChange={(open) => setSummaryDialog({ open, paper: summaryDialog.paper })}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Complete Review Summary</DialogTitle>
              <DialogDescription>
                Please enter a summary of what you learned from &quot;{summaryDialog.paper?.name} &quot; before completing the
                review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="summary">What did you learn from this paper?</Label>
                <Textarea
                  id="summary"
                  placeholder="Enter key insights, methodologies, findings, or any important learnings from this paper..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-sm text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <div>
                <Label htmlFor="review-file">Upload your review file</Label>
                <Input
                  id="review-file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                {reviewFile && <p className="text-sm text-muted-foreground mt-2">Selected: {reviewFile.name}</p>}
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSummaryDialog({ open: false, paper: null })
                  setSummary("")
                  setReviewFile(null)
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={completePaper} disabled={!summary.trim() && !reviewFile} className="w-full sm:w-auto">
                Complete Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

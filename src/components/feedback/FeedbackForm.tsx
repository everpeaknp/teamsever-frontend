"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface FeedbackFormProps {
  workspaceId: string;
  workspaceName: string;
}

const FEEDBACK_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Support Question",
  "General Feedback",
  "Performance Issue",
] as const;

export default function FeedbackForm({
  workspaceId,
  workspaceName,
}: FeedbackFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleLength = title.length;
  const descriptionLength = description.length;
  const maxTitleLength = 200;
  const maxDescriptionLength = 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (title.length > maxTitleLength) {
      toast.error(`Title must be ${maxTitleLength} characters or less`);
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (description.length > maxDescriptionLength) {
      toast.error(`Description must be ${maxDescriptionLength} characters or less`);
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/feedback", {
        title: title.trim(),
        description: description.trim(),
        category,
        workspaceId,
      });

      toast.success("Feedback submitted successfully! Thank you for your input.");

      // Clear form on success
      setTitle("");
      setDescription("");
      setCategory("");
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message === "Network Error") {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#111111] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Submit Feedback</h3>
          <p className="text-sm text-gray-400">
            Help us improve by sharing your thoughts
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title Field */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-gray-200">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={maxTitleLength}
            placeholder="Brief summary of your feedback"
            className="bg-[#0a0a0a] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${
                titleLength > maxTitleLength * 0.9
                  ? "text-amber-500"
                  : "text-gray-500"
              }`}
            >
              {titleLength} / {maxTitleLength}
            </span>
          </div>
        </div>

        {/* Category Field */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-gray-200">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select value={category} onValueChange={setCategory} disabled={submitting}>
            <SelectTrigger
              id="category"
              className="bg-[#0a0a0a] border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500"
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-gray-700">
              {FEEDBACK_CATEGORIES.map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat}
                  className="text-white hover:bg-gray-800 focus:bg-gray-800"
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-200">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={maxDescriptionLength}
            placeholder="Provide detailed information about your feedback..."
            rows={6}
            className="bg-[#0a0a0a] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 resize-none"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${
                descriptionLength > maxDescriptionLength * 0.9
                  ? "text-amber-500"
                  : "text-gray-500"
              }`}
            >
              {descriptionLength} / {maxDescriptionLength}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
        >
          {submitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

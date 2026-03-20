
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { api } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";


interface CreateStreamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const categories = [
    "Gaming",
    "Music",
    "Art",
    "Technology",
    "Education",
    "Entertainment",
    "Sports",
    "Talk Shows",
    "General"
];

export const CreateStreamDialog = ({ open, onOpenChange }: CreateStreamDialogProps) => {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [tags, setTags] = useState("");
    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate: createStream, isPending: isCreating } = useMutation({
        mutationFn: () => {
            const thumbnailUrl = thumbnail || `https://picsum.photos/seed/${Date.now()}/400/225`;
            return api.post("/api/streams", {
                title,
                category: category.toLowerCase(),
                description,
                thumbnail: thumbnailUrl,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                isPending: true,
            });
        },
        onSuccess: (res) => {
            toast.success(`Stream "${title}" created successfully!`);
            setTitle(""); setCategory(""); setDescription(""); setThumbnail(""); setTags("");
            queryClient.invalidateQueries({ queryKey: ['dashboard-streams'] });
            onOpenChange(false);
            router.push(`/stream/${res.data.stream.id}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to create stream");
        },
    });

    const handleCreateStream = () => {
        if (!title.trim()) { toast.error("Please enter a stream title"); return; }
        if (!category) { toast.error("Please select a category"); return; }
        createStream();
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create New Stream</DialogTitle>
                    <DialogDescription>
                        Set up your stream details. Fill in the information below to get started.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Stream Title *</Label>
                        <Input
                            id="title"
                            placeholder="Enter your stream title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-surface border-border"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category" className="bg-surface border-border">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Tell viewers what your stream is about..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-surface border-border min-h-[100px]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="thumbnail">Thumbnail URL (optional)</Label>
                        <Input
                            id="thumbnail"
                            placeholder="https://example.com/image.jpg"
                            value={thumbnail}
                            onChange={(e) => setThumbnail(e.target.value)}
                            className="bg-surface border-border"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                            id="tags"
                            placeholder="gaming, fps, competitive"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="bg-surface border-border"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button variant="default" className="cursor-pointer" onClick={handleCreateStream} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create Stream"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

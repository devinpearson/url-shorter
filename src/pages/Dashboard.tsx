import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import { Trash2 } from "lucide-react";

interface Url {
  _id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
}

export default function Dashboard() {
  const [urls, setUrls] = useState<Url[]>([]);
  const [originalUrl, setOriginalUrl] = useState("");
  const [customShortId, setCustomShortId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get("/api/urls")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setUrls(res.data);
        } else {
          setError("Not authenticated or unexpected response.");
        }
      })
      .catch(() => {
        setError("You must be logged in to view your URLs.");
      });
  }, []);

  const handleCreate = async () => {
    if (!originalUrl) return;
    try {
      const payload: { originalUrl: string; customShortId?: string } = { originalUrl };
      if (customShortId.trim()) payload.customShortId = customShortId.trim();
      const res = await axios.post("/api/urls", payload);
      setUrls([res.data, ...urls]);
      setOriginalUrl("");
      setCustomShortId("");
      setError(null);
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("That short ID is already in use. Please choose another.");
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("You must be logged in to create URLs.");
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  const handleDelete = async (shortId: string) => {
    try {
      await axios.delete(`/api/urls/${shortId}`);
      setUrls((prev) => prev.filter((url) => url.shortId !== shortId));
    } catch {
      setError("Failed to delete URL. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4 font-sans text-primary">
          Your Shortened URLs
        </h2>
        {error && (
          <div className="text-destructive mb-4 bg-destructive/10 border border-destructive rounded px-4 py-2">
            {error}
          </div>
        )}
        <div className="flex gap-2 mb-6">
          <Input
            className="flex-1 text-base"
            placeholder="Paste a long URL..."
            value={originalUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOriginalUrl(e.target.value)}
            type="url"
            aria-label="Paste a long URL"
          />
          <Input
            className="w-40 text-base"
            placeholder="Custom short ID (optional)"
            value={customShortId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomShortId(e.target.value)}
            type="text"
            aria-label="Custom short ID"
            maxLength={32}
          />
          <Button onClick={handleCreate} variant="default" size="md">
            Shorten
          </Button>
        </div>
        <div className="space-y-4">
          {Array.isArray(urls) &&
            urls.map((url) => (
              <Card
                key={url._id}
                className="flex items-center justify-between p-4 rounded-md shadow-md border border-border bg-background"
              >
                <div>
                  <div className="font-mono text-primary text-base mb-1">
                    {window.location.origin + "//" + url.shortId}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {url.originalUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div className="font-bold text-lg">{url.clicks} clicks</div>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="Delete URL"
                    onClick={() => handleDelete(url.shortId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </>
  );
}

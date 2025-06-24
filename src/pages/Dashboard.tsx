import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";

interface Url {
  _id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
}

export default function Dashboard() {
  const [urls, setUrls] = useState<Url[]>([]);
  const [originalUrl, setOriginalUrl] = useState("");
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
      .catch((err) => {
        setError("You must be logged in to view your URLs.");
      });
  }, []);

  const handleCreate = async () => {
    if (!originalUrl) return;
    try {
      const res = await axios.post("/api/urls", { originalUrl });
      setUrls([res.data, ...urls]);
      setOriginalUrl("");
    } catch {
      setError("You must be logged in to create URLs.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Your Shortened URLs</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="flex gap-2 mb-6">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Paste a long URL..."
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
          />
          <Button onClick={handleCreate}>Shorten</Button>
        </div>
        <div className="space-y-4">
          {Array.isArray(urls) &&
            urls.map((url) => (
              <Card
                key={url._id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <div className="font-mono text-blue-600">
                    {window.location.origin + "//" + url.shortId}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {url.originalUrl}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{url.clicks} clicks</div>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </>
  );
}

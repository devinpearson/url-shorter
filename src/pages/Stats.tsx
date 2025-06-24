import { Card } from "../components/ui/card";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

interface Url {
  _id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
}

export default function Stats() {
  const { shortId } = useParams();
  const [url, setUrl] = useState<Url | null>(null);

  useEffect(() => {
    axios.get(`/api/urls/${shortId}`).then((res) => setUrl(res.data));
  }, [shortId]);

  if (!url) return <div className="text-center text-muted-foreground py-12">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto py-8">
        <Card className="p-6 rounded-md shadow-md border border-border bg-background">
          <div className="font-mono text-primary text-lg mb-2">
            {window.location.origin + "//" + url.shortId}
          </div>
          <div className="mb-2 text-muted-foreground">Original URL: {url.originalUrl}</div>
          <div className="font-bold text-lg">Total Clicks: {url.clicks}</div>
        </Card>
      </div>
    </>
  );
}

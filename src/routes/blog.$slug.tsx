import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { type BlogPost, fetchBlogPostBySlug } from "@/lib/public-content.functions";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogDetailsPage,
});

function BlogDetailsPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBlogPostBySlug({ data: { slug } })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 pt-8">
        <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-3xl bg-white/10" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-background px-6 pt-8 text-center">
        <h1 className="font-display text-4xl font-semibold">Blog Post Not Found</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">This post is unavailable or has not been published yet.</p>
        <Link to="/#blog" className="mt-6 inline-flex">
          <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Blog</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <Link to="/#blog" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {post.thumbnail_url && (
            <img
              src={post.thumbnail_url}
              alt={post.thumbnail_alt || post.title}
              className="h-[280px] w-full object-cover sm:h-[380px]"
            />
          )}
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-primary">
              <span>{post.category}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(post.published_at)}
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>
            <div className="mt-8 whitespace-pre-line text-base leading-8 text-foreground/90">{post.content}</div>
          </div>
        </div>
      </article>
    </main>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(parsed);
}

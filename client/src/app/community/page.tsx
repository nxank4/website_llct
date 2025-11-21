"use client";


import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  MessageCircle,
  User,
  Clock,
  TrendingUp,
} from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { formatRelativeTime } from "@/lib/utils";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  category: string;
  created_at: string;
  likes: number;
  comments_count: number;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  const isAuthenticated = !!session;
  const authFetch = useAuthFetch();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Tất cả");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const categories = [
    "Tất cả",
    "Học tập",
    "Thảo luận",
    "Hỏi đáp",
    "Chia sẻ",
    "Thông báo",
  ];

  const fetchPosts = useCallback(async () => {
    try {
      const response = await authFetch(
        "http://127.0.0.1:8000/api/v1/community/posts"
      );
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "Tất cả" || post.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    if (resolvedDarkMode) {
      switch (category) {
        case "Học tập":
          return "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]";
        case "Thảo luận":
          return "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]";
        case "Hỏi đáp":
          return "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]";
        case "Chia sẻ":
          return "bg-[hsl(var(--brand-violet))]/15 text-[hsl(var(--brand-violet))]";
        case "Thông báo":
          return "bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]";
        default:
          return "bg-muted text-muted-foreground";
      }
    } else {
      switch (category) {
        case "Học tập":
          return "bg-blue-100 text-blue-800";
        case "Thảo luận":
          return "bg-green-100 text-green-800";
        case "Hỏi đáp":
          return "bg-yellow-100 text-yellow-800";
        case "Chia sẻ":
          return "bg-purple-100 text-purple-800";
        case "Thông báo":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Cộng đồng
              </h1>
              <p className="text-muted-foreground mt-2">
                Trao đổi, học hỏi và chia sẻ kiến thức
              </p>
            </div>
            {isAuthenticated && (
              <Link
                href="/community/create"
                className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Tạo bài viết
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Danh mục
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilterCategory(category)}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-lg transition-colors",
                      filterCategory === category
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-md border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Thống kê
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tổng bài viết
                  </span>
                  <span className="font-semibold text-foreground">
                    {posts.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Bài viết hôm nay
                  </span>
                  <span className="font-semibold text-foreground">
                    12
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Thành viên hoạt động
                  </span>
                  <span className="font-semibold text-foreground">
                    156
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <SearchBar
                onSearch={setSearchTerm}
                placeholder="Tìm kiếm bài viết..."
              />
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <LoadingSkeleton key={i} type="card" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="block bg-card rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-2 hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 mb-3">
                          {post.content}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                          post.category
                        )} ml-4`}
                      >
                        {post.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{post.author_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{formatRelativeTime(post.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span>{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!loading && filteredPosts.length === 0 && (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Chưa có bài viết
                </h3>
                <p className="text-muted-foreground mb-4">
                  Hãy là người đầu tiên tạo bài viết trong danh mục này!
                </p>
                {isAuthenticated && (
                  <Link
                    href="/community/create"
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Tạo bài viết
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

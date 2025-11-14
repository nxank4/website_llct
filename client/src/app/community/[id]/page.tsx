'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, MessageCircle, ThumbsUp, User, Clock } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

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

interface CommentItem {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export default function CommunityPostDetailPage() {
  const params = useParams();
  const postId = useMemo(() => Number(params?.id), [params]);
  const router = useRouter();
  const { data: session } = useSession();
  
  // Type-safe access to user with extended properties
  const user = session?.user as
    | {
        id?: string;
        full_name?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const p = await fetch(`http://127.0.0.1:8000/api/v1/community/posts/${postId}`).then(r => r.json());
        const c = await fetch(`http://127.0.0.1:8000/api/v1/community/posts/${postId}/comments`).then(r => r.json());
        if (!cancelled) {
          setPost(p);
          setComments(c);
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    };
    if (postId) load();
    return () => { cancelled = true; };
  }, [postId]);

  const onLike = async () => {
    await fetch(`http://127.0.0.1:8000/api/v1/community/posts/${postId}/like`, { method: 'POST' });
    setPost(prev => prev ? { ...prev, likes: prev.likes + 1 } : prev);
  };

  const onAddComment = async () => {
    if (!newComment.trim() || !user || !user.id) return;
    const res = await fetch(`http://127.0.0.1:8000/api/v1/community/posts/${postId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        author_id: Number(user.id), 
        author_name: user.full_name || user.name || 'Anonymous', 
        content: newComment 
      })
    }).then(r => r.json());
    setComments(prev => [res, ...prev]);
    setNewComment('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center mb-4"><ArrowLeft className="h-5 w-5 mr-1"/>Quay lại</button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-900 dark:text-white">Bài viết không tồn tại</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center mb-4"><ArrowLeft className="h-5 w-5 mr-1"/>Quay lại</button>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><User className="h-5 w-5 text-blue-600 dark:text-blue-400"/></div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{post.author_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center"><Clock className="h-3 w-3 mr-1" />{new Date(post.created_at).toLocaleString('vi-VN')}</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{post.title}</h1>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-6">{post.content}</div>
          <div className="flex items-center space-x-4">
            <button onClick={onLike} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><ThumbsUp className="h-4 w-4 mr-1"/> {post.likes}</button>
            <div className="flex items-center text-gray-600 dark:text-gray-400"><MessageCircle className="h-4 w-4 mr-1"/> {post.comments_count} bình luận</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
          <div className="font-semibold text-gray-900 dark:text-white mb-4">Bình luận</div>
          <div className="flex space-x-2 mb-4">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" placeholder="Viết bình luận..." />
            <button onClick={onAddComment} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Gửi</button>
          </div>
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{c.author_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{c.content}</div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">Chưa có bình luận</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


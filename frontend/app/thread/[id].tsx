import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiFetch } from "@/constants/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommentNode {
  id: number;
  debate_id: number;
  parent_id: number | null;
  body: string;
  author_display: string;
  university: string;
  author_verified: boolean;
  upvotes: number;
  created_at: string;
  replies: CommentNode[];
}

interface ThreadDetail {
  id: number;
  title: string;
  body: string;
  category: string;
  author_display: string;
  university: string;
  author_verified: boolean;
  region: string;
  age_group: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  comments: CommentNode[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  교육: { bg: "bg-purple-50", text: "text-purple-600" },
  청년: { bg: "bg-blue-50",   text: "text-blue-600" },
  경제: { bg: "bg-amber-50",  text: "text-amber-600" },
  복지: { bg: "bg-green-50",  text: "text-green-600" },
  환경: { bg: "bg-emerald-50",text: "text-emerald-600" },
  주거: { bg: "bg-orange-50", text: "text-orange-600" },
  고용: { bg: "bg-red-50",    text: "text-red-500" },
  보건: { bg: "bg-pink-50",   text: "text-pink-600" },
  교통: { bg: "bg-slate-100", text: "text-slate-600" },
};

// ── Fallback ──────────────────────────────────────────────────────────────────

const FALLBACK: ThreadDetail = {
  id: 1,
  title: "수능 절대평가 전환, 대학 입시 공정성에 영향을 줄까요?",
  body: "교육부가 수능 절대평가 전환을 검토 중입니다. 현행 상대평가는 점수 인플레를 막지만 극심한 경쟁을 유발하고, 절대평가는 학업 부담을 줄이지만 대학 변별력 문제가 생깁니다. 대학생으로서 직접 수능을 경험한 여러분의 생각을 나눠주세요.",
  category: "교육",
  author_display: "김G**",
  university: "연세대",
  author_verified: true,
  region: "서울",
  age_group: "20대",
  upvotes: 312,
  downvotes: 45,
  comment_count: 3,
  created_at: "2026-05-09T09:00:00",
  comments: [
    {
      id: 1, debate_id: 1, parent_id: null,
      body: "절대평가로 전환하면 학업 부담이 줄어드는 장점이 있지만, 대학 변별력 확보가 어려워집니다. 별도의 논술·면접 비중이 커져 또 다른 사교육 시장이 형성될 수 있어요.",
      author_display: "이M**", university: "고려대", author_verified: true, upvotes: 87,
      created_at: "2026-05-09T10:30:00",
      replies: [
        {
          id: 2, debate_id: 1, parent_id: 1,
          body: "동의합니다. 프랑스 바칼로레아처럼 논술형 절대평가는 고교 수업 자체를 바꿔야 가능합니다.",
          author_display: "박S**", university: "서울대", author_verified: true, upvotes: 34,
          created_at: "2026-05-09T11:00:00", replies: [],
        },
      ],
    },
    {
      id: 3, debate_id: 1, parent_id: null,
      body: "절대평가의 핵심 문제는 기준점 설정입니다. 어느 기준으로 합격/불합격을 나눌지, 그 기준이 매년 달라질 수 있다는 점에서 오히려 예측 불가능성이 커질 수 있습니다.",
      author_display: "정W**", university: "연세대", author_verified: true, upvotes: 56,
      created_at: "2026-05-09T12:00:00", replies: [],
    },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <Ionicons name="checkmark-circle" size={13} color="#2563EB" style={{ marginLeft: 3 }} />
  );
}

function AuthorRow({
  display,
  university,
  verified,
  time,
}: {
  display: string;
  university: string;
  verified: boolean;
  time: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="w-5 h-5 rounded-full bg-primary-100 items-center justify-center mr-1.5">
        <Text className="text-primary-600 text-xs font-black">{university[0]}</Text>
      </View>
      <Text className="text-slate-700 text-xs font-semibold">{display}</Text>
      {verified && <VerifiedBadge />}
      <Text className="text-slate-400 text-xs ml-1.5">· {university} · {time}</Text>
    </View>
  );
}

function CommentCard({
  comment,
  onReply,
  onVote,
}: {
  comment: CommentNode;
  onReply: (c: CommentNode) => void;
  onVote: (commentId: number) => void;
}) {
  return (
    <View className="mb-4">
      {/* Top-level comment */}
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <AuthorRow
          display={comment.author_display}
          university={comment.university}
          verified={comment.author_verified}
          time={timeAgo(comment.created_at)}
        />
        <Text className="text-slate-800 text-sm leading-5.5 mt-2.5 mb-3">{comment.body}</Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-slate-100 rounded-full px-3 py-1.5"
            onPress={() => onVote(comment.id)}
          >
            <Ionicons name="arrow-up" size={12} color="#64748B" />
            <Text className="text-slate-600 text-xs font-bold">{comment.upvotes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => onReply(comment)}
          >
            <Ionicons name="return-down-forward-outline" size={14} color="#94A3B8" />
            <Text className="text-slate-400 text-xs font-medium">답글</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nested replies */}
      {comment.replies.map((reply) => (
        <View key={reply.id} className="ml-6 mt-2">
          <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <View className="flex-row items-center mb-2">
              <Ionicons name="return-down-forward" size={12} color="#94A3B8" style={{ marginRight: 6 }} />
              <AuthorRow
                display={reply.author_display}
                university={reply.university}
                verified={reply.author_verified}
                time={timeAgo(reply.created_at)}
              />
            </View>
            <Text className="text-slate-700 text-sm leading-5 mb-2.5">{reply.body}</Text>
            <TouchableOpacity
              className="flex-row items-center gap-1 self-start bg-white rounded-full px-3 py-1.5 border border-slate-100"
              onPress={() => onVote(reply.id)}
            >
              <Ionicons name="arrow-up" size={12} color="#64748B" />
              <Text className="text-slate-600 text-xs font-bold">{reply.upvotes}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toxicError, setToxicError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ThreadDetail>(`/debates/${id}`)
      .then((data) => {
        if (cancelled) return;
        setThread(data);
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
        setComments(data.comments);
      })
      .catch(() => {
        if (cancelled) return;
        setThread(FALLBACK);
        setUpvotes(FALLBACK.upvotes);
        setDownvotes(FALLBACK.downvotes);
        setComments(FALLBACK.comments);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleThreadVote = useCallback(
    async (dir: "up" | "down") => {
      if (userVote === dir) return;
      if (dir === "up") {
        setUpvotes((v) => v + 1);
        if (userVote === "down") setDownvotes((v) => v - 1);
      } else {
        setDownvotes((v) => v + 1);
        if (userVote === "up") setUpvotes((v) => v - 1);
      }
      setUserVote(dir);
      try { await apiFetch(`/debates/${id}/vote?direction=${dir}`, { method: "POST" }); } catch {}
    },
    [id, userVote]
  );

  const handleCommentVote = useCallback(async (commentId: number) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, upvotes: c.upvotes + 1 };
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId ? { ...r, upvotes: r.upvotes + 1 } : r
          ),
        };
      })
    );
    try {
      await apiFetch(`/debates/${id}/comments/${commentId}/vote`, { method: "POST" });
    } catch {}
  }, [id]);

  const handleReply = useCallback((c: CommentNode) => {
    setReplyingTo(c);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setToxicError(null);

    try {
      const newComment = await apiFetch<CommentNode>(
        `/debates/${id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body: text, parent_id: replyingTo?.id ?? null }),
        }
      );

      setComments((prev) => {
        if (newComment.parent_id != null) {
          return prev.map((c) =>
            c.id === newComment.parent_id
              ? { ...c, replies: [...c.replies, newComment] }
              : c
          );
        }
        return [...prev, newComment];
      });
      setCommentText("");
      setReplyingTo(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const detail = err.detail as { is_toxic?: boolean; message?: string };
        if (detail?.is_toxic) {
          setToxicError(
            detail.message ??
              "건설적이지 않은 표현이 감지되었습니다. 논리적으로 다시 작성해주세요."
          );
        } else {
          setToxicError("댓글 작성에 실패했습니다.");
        }
      } else {
        // Optimistic insert when API offline
        const offline: CommentNode = {
          id: Date.now(),
          debate_id: Number(id),
          parent_id: replyingTo?.id ?? null,
          body: text,
          author_display: "나**",
          university: "서울대",
          author_verified: true,
          upvotes: 0,
          created_at: new Date().toISOString(),
          replies: [],
        };
        setComments((prev) => {
          if (offline.parent_id != null) {
            return prev.map((c) =>
              c.id === offline.parent_id ? { ...c, replies: [...c.replies, offline] } : c
            );
          }
          return [...prev, offline];
        });
        setCommentText("");
        setReplyingTo(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#2563EB" size="large" />
        <Text className="text-slate-400 mt-3 text-sm">토론을 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (!thread) return null;

  const c = CATEGORY_COLORS[thread.category] ?? { bg: "bg-slate-100", text: "text-slate-600" };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={18} color="#334155" />
        </TouchableOpacity>
        <Text className="text-slate-900 font-bold text-base flex-1" numberOfLines={1}>
          {thread.title}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Thread content + comment list */}
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Thread body */}
          <View className="bg-white px-5 pt-5 pb-4 border-b border-slate-100">
            {/* Tags */}
            <View className="flex-row items-center flex-wrap gap-1.5 mb-3">
              <View className={`${c.bg} rounded-lg px-2.5 py-0.5`}>
                <Text className={`${c.text} text-xs font-semibold`}>{thread.category}</Text>
              </View>
              <View className="bg-slate-100 rounded-lg px-2.5 py-0.5">
                <Text className="text-slate-500 text-xs font-medium">{thread.region}</Text>
              </View>
              <View className="bg-slate-100 rounded-lg px-2.5 py-0.5">
                <Text className="text-slate-500 text-xs font-medium">{thread.age_group}</Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-slate-900 font-black text-lg leading-6 mb-3">
              {thread.title}
            </Text>

            {/* Body */}
            <Text className="text-slate-700 text-sm leading-6 mb-4">{thread.body}</Text>

            {/* Author */}
            <AuthorRow
              display={thread.author_display}
              university={thread.university}
              verified={thread.author_verified}
              time={timeAgo(thread.created_at)}
            />

            {/* Vote row */}
            <View className="flex-row items-center mt-4 pt-4 border-t border-slate-100 gap-3">
              <TouchableOpacity
                onPress={() => handleThreadVote("up")}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                  userVote === "up" ? "bg-primary-600" : "bg-slate-100"
                }`}
              >
                <Ionicons name="arrow-up" size={15} color={userVote === "up" ? "#fff" : "#64748B"} />
                <Text className={`font-bold text-sm ${userVote === "up" ? "text-white" : "text-slate-600"}`}>
                  {upvotes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThreadVote("down")}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                  userVote === "down" ? "bg-red-500" : "bg-slate-100"
                }`}
              >
                <Ionicons name="arrow-down" size={15} color={userVote === "down" ? "#fff" : "#94A3B8"} />
                <Text className={`font-medium text-sm ${userVote === "down" ? "text-white" : "text-slate-400"}`}>
                  {downvotes}
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center gap-1.5 ml-2">
                <Ionicons name="chatbubble-outline" size={14} color="#94A3B8" />
                <Text className="text-slate-500 text-sm font-medium">
                  {comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0)}개 댓글
                </Text>
              </View>
            </View>
          </View>

          {/* Comment list */}
          <View className="px-4 pt-4">
            <Text className="text-slate-700 font-bold text-sm mb-4">
              💬 댓글 {comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0)}개
            </Text>

            {comments.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-slate-100">
                <Text className="text-3xl mb-2">💭</Text>
                <Text className="text-slate-400 text-sm">첫 번째 댓글을 달아보세요!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onVote={handleCommentVote}
                />
              ))
            )}
            <View className="h-6" />
          </View>
        </ScrollView>

        {/* Compose box */}
        <View className="bg-white border-t border-slate-200 px-4 pt-3 pb-4">
          {/* Toxicity error banner */}
          {toxicError && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3 flex-row items-start">
              <Ionicons name="alert-circle" size={15} color="#EF4444" style={{ marginTop: 1, marginRight: 8 }} />
              <View className="flex-1">
                <Text className="text-red-700 text-xs font-bold mb-0.5">
                  ⚠️ Gemini AI 검토 결과
                </Text>
                <Text className="text-red-600 text-xs leading-4.5">{toxicError}</Text>
              </View>
              <TouchableOpacity onPress={() => setToxicError(null)}>
                <Ionicons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Reply-to indicator */}
          {replyingTo && (
            <View className="flex-row items-center bg-slate-50 rounded-xl px-3 py-2 mb-2">
              <Ionicons name="return-down-forward-outline" size={13} color="#2563EB" />
              <Text className="text-primary-600 text-xs font-semibold ml-2 flex-1">
                {replyingTo.author_display}에게 답글 달기
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-end gap-2">
            <View className="w-8 h-8 rounded-full bg-primary-600 items-center justify-center flex-shrink-0">
              <Text className="text-white text-xs font-black">나</Text>
            </View>
            <View className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 flex-row items-end">
              <TextInput
                ref={inputRef}
                className="flex-1 text-slate-800 text-sm"
                style={{ maxHeight: 100, textAlignVertical: "top" }}
                placeholder={
                  replyingTo
                    ? `${replyingTo.author_display}에게 답글...`
                    : "건설적인 의견을 작성해주세요..."
                }
                placeholderTextColor="#94A3B8"
                value={commentText}
                onChangeText={(t) => { setCommentText(t); setToxicError(null); }}
                multiline
                returnKeyType="default"
              />
            </View>
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className={`w-10 h-10 rounded-full items-center justify-center flex-shrink-0 ${
                commentText.trim() && !submitting ? "bg-primary-600" : "bg-slate-200"
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="send"
                  size={16}
                  color={commentText.trim() ? "white" : "#94A3B8"}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* AI warning label */}
          <Text className="text-slate-400 text-xs text-center mt-2">
            🛡 Gemini AI가 댓글을 검토합니다 · 인증된 학생만 참여 가능
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

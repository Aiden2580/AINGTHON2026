import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError, apiFetch } from "@/constants/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Thread {
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
  bill_id?: string | null;
  bill_title?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "hot", label: "🔥 인기순" },
  { key: "new", label: "🕐 최신순" },
  { key: "top", label: "⭐ 추천순" },
];

const REGIONS = ["전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "강원", "기타"];
const AGE_GROUPS = ["전체 연령", "20대", "30대", "40대", "50대+"];
const CATEGORIES = ["전체", "교육", "청년", "경제", "복지", "환경", "주거", "고용", "보건", "교통"];

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
  기타: { bg: "bg-slate-100", text: "text-slate-600" },
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return <Ionicons name="checkmark-circle" size={13} color="#2563EB" style={{ marginLeft: 3 }} />;
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3.5 py-1.5 rounded-full border mr-2 ${
        active ? "bg-primary-600 border-primary-600" : "bg-white border-slate-200"
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-slate-500"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ThreadCard({
  thread,
  voteState,
  onBillTap,
  onVote,
  onPress,
}: {
  thread: Thread;
  voteState: { upvotes: number; downvotes: number; userVote: "up" | "down" | null };
  onVote: (dir: "up" | "down") => void;
  onPress: () => void;
  onBillTap: (billId: string) => void;
}) {
  const c = CATEGORY_COLORS[thread.category] ?? { bg: "bg-slate-100", text: "text-slate-600" };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-100"
      activeOpacity={0.75}
      onPress={onPress}
    >
      {/* Tags row */}
      <View className="flex-row items-center flex-wrap mb-2 gap-1.5">
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
      <Text className="text-slate-900 font-bold text-sm leading-5 mb-1.5" numberOfLines={2}>
        {thread.title}
      </Text>

      {/* Linked bill chip — clickable, jumps to information tab */}
      {thread.bill_id && thread.bill_title && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onBillTap(thread.bill_id!); }}
          className="flex-row items-center bg-indigo-50 rounded-lg px-2 py-1 self-start mb-2"
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={11} color="#4F46E5" />
          <Text className="text-indigo-700 text-[11px] font-semibold ml-1" numberOfLines={1}>
            관련 법안: {thread.bill_title}
          </Text>
        </TouchableOpacity>
      )}

      {/* Body preview */}
      <Text className="text-slate-500 text-xs leading-4.5 mb-3" numberOfLines={2}>
        {thread.body}
      </Text>

      {/* Author */}
      <View className="flex-row items-center mb-3">
        <View className="w-5 h-5 rounded-full bg-primary-100 items-center justify-center mr-1.5">
          <Text className="text-primary-600 text-xs font-black">{thread.university[0]}</Text>
        </View>
        <Text className="text-slate-700 text-xs font-semibold">{thread.author_display}</Text>
        {thread.author_verified && <VerifiedBadge />}
        <Text className="text-slate-400 text-xs ml-1.5">· {thread.university}</Text>
      </View>

      {/* Actions row */}
      <View className="flex-row items-center pt-3 border-t border-slate-100 gap-3">
        {/* Upvote */}
        <TouchableOpacity
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            voteState.userVote === "up" ? "bg-primary-600" : "bg-slate-100"
          }`}
          onPress={(e) => { e.stopPropagation?.(); onVote("up"); }}
        >
          <Ionicons
            name="arrow-up"
            size={13}
            color={voteState.userVote === "up" ? "#fff" : "#64748B"}
          />
          <Text
            className={`text-xs font-bold ${
              voteState.userVote === "up" ? "text-white" : "text-slate-600"
            }`}
          >
            {voteState.upvotes}
          </Text>
        </TouchableOpacity>

        {/* Downvote */}
        <TouchableOpacity
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            voteState.userVote === "down" ? "bg-red-500" : "bg-slate-100"
          }`}
          onPress={(e) => { e.stopPropagation?.(); onVote("down"); }}
        >
          <Ionicons
            name="arrow-down"
            size={13}
            color={voteState.userVote === "down" ? "#fff" : "#94A3B8"}
          />
          <Text
            className={`text-xs font-medium ${
              voteState.userVote === "down" ? "text-white" : "text-slate-400"
            }`}
          >
            {voteState.downvotes}
          </Text>
        </TouchableOpacity>

        {/* Comments */}
        <View className="flex-row items-center gap-1 ml-1">
          <Ionicons name="chatbubble-outline" size={13} color="#94A3B8" />
          <Text className="text-slate-500 text-xs font-medium">{thread.comment_count}개 댓글</Text>
        </View>

        <TouchableOpacity className="ml-auto">
          <Ionicons name="share-outline" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DebateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bill_id?: string;
    bill_title?: string;
    bill_category?: string;
    create?: string;
  }>();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [region, setRegion] = useState("전체");
  const [ageGroup, setAgeGroup] = useState("전체 연령");
  const category = "전체"; // future: wire to a UI filter chip row

  // Bill filter (set when navigating from information tab "토론 찾기")
  const [billFilter, setBillFilter] = useState<{ id: string; title: string } | null>(null);

  // vote states keyed by thread id
  const [votes, setVotes] = useState<
    Record<number, { upvotes: number; downvotes: number; userVote: "up" | "down" | null }>
  >({});

  // Create thread modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("교육");
  const [newRegion, setNewRegion] = useState("서울");
  const [linkedBill, setLinkedBill] = useState<{ id: string; title: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Handle deep-link params from information tab ──────────────────────────
  useEffect(() => {
    if (params.bill_id && params.bill_title) {
      if (params.create === "1") {
        // "토론하기" — open create modal pre-filled with this bill
        setLinkedBill({ id: params.bill_id, title: params.bill_title });
        if (params.bill_category) setNewCategory(params.bill_category);
        setNewTitle(`[${params.bill_title}] 에 대한 의견`);
        setNewBody("");
        setCreateError(null);
        setShowCreate(true);
        // Clear params so re-renders don't keep reopening the modal
        router.setParams({ bill_id: undefined, bill_title: undefined, bill_category: undefined, create: undefined });
      } else {
        // "토론 찾기" — apply bill filter
        setBillFilter({ id: params.bill_id, title: params.bill_title });
        router.setParams({ bill_id: undefined, bill_title: undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bill_id, params.create]);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ sort });
      if (region !== "전체") qs.set("region", region);
      if (ageGroup !== "전체 연령") qs.set("age_group", ageGroup);
      if (category !== "전체") qs.set("category", category);
      if (billFilter)               qs.set("bill_id", billFilter.id);

      const data = await apiFetch<Thread[]>(`/debates?${qs}`);
      setThreads(data);

      // Seed vote state for new threads
      setVotes((prev) => {
        const next = { ...prev };
        data.forEach((t) => {
          if (!next[t.id]) {
            next[t.id] = { upvotes: t.upvotes, downvotes: t.downvotes, userVote: null };
          }
        });
        return next;
      });
      setOffline(false);
    } catch {
      setThreads([]);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [sort, region, ageGroup, category, billFilter]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleVote = useCallback(
    async (threadId: number, dir: "up" | "down") => {
      setVotes((prev) => {
        const cur = prev[threadId];
        if (!cur || cur.userVote === dir) return prev; // already voted
        return {
          ...prev,
          [threadId]: {
            upvotes: dir === "up" ? cur.upvotes + 1 : cur.upvotes - (cur.userVote === "up" ? 1 : 0),
            downvotes: dir === "down" ? cur.downvotes + 1 : cur.downvotes - (cur.userVote === "down" ? 1 : 0),
            userVote: dir,
          },
        };
      });
      try {
        await apiFetch(`/debates/${threadId}/vote?direction=${dir}`, { method: "POST" });
      } catch {
        // silently fail — optimistic update stays
      }
    },
    []
  );

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await apiFetch<Thread>("/debates", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim(),
          category: newCategory,
          region: newRegion,
          bill_id: linkedBill?.id ?? null,
        }),
      });
      setThreads((prev) => [created, ...prev]);
      setVotes((prev) => ({
        ...prev,
        [created.id]: { upvotes: 0, downvotes: 0, userVote: null },
      }));
      setShowCreate(false);
      setNewTitle("");
      setNewBody("");
      setLinkedBill(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const detail = err.detail as { is_toxic?: boolean; message?: string };
        setCreateError(
          detail?.message ??
            "건설적이지 않은 표현이 감지되었습니다. 논리적으로 다시 작성해주세요."
        );
      } else {
        setCreateError("게시글 작성에 실패했습니다. 서버 연결을 확인해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-5 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-slate-900">토론 광장</Text>
            {offline && (
              <View className="bg-amber-50 rounded-lg px-2 py-0.5 flex-row items-center">
                <Ionicons name="cloud-offline-outline" size={11} color="#D97706" />
                <Text className="text-amber-600 text-xs ml-1">오프라인</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => { setShowCreate(true); setCreateError(null); }}
            className="bg-primary-600 rounded-xl px-4 py-2 flex-row items-center"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-semibold text-sm ml-1">글쓰기</Text>
          </TouchableOpacity>
        </View>

        {/* Sort chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row">
            {SORT_OPTIONS.map((o) => (
              <FilterChip
                key={o.key}
                label={o.label}
                active={sort === o.key}
                onPress={() => setSort(o.key as typeof sort)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Region chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row">
            {REGIONS.map((r) => (
              <FilterChip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
            ))}
          </View>
        </ScrollView>

        {/* Age group chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {AGE_GROUPS.map((a) => (
              <FilterChip key={a} label={a} active={ageGroup === a} onPress={() => setAgeGroup(a)} />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bill filter banner — shown when arriving from "토론 찾기" */}
      {billFilter && (
        <View className="mx-4 mt-3 mb-1 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 flex-row items-center">
          <Ionicons name="document-text" size={14} color="#4F46E5" />
          <Text className="text-indigo-700 text-xs font-semibold ml-2 flex-1" numberOfLines={1}>
            관련 법안: {billFilter.title}
          </Text>
          <TouchableOpacity onPress={() => setBillFilter(null)}>
            <Ionicons name="close-circle" size={18} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      )}

      {/* Thread list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" size="large" />
          <Text className="text-slate-400 text-sm mt-3">토론을 불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-3">
          {threads.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-slate-500 font-medium">해당 조건의 토론이 없습니다.</Text>
            </View>
          ) : (
            threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                voteState={
                  votes[thread.id] ?? { upvotes: thread.upvotes, downvotes: thread.downvotes, userVote: null }
                }
                onVote={(dir) => handleVote(thread.id, dir)}
                onPress={() => router.push(`/thread/${thread.id}` as any)}
                onBillTap={() => router.push("/(tabs)/information" as any)}
              />
            ))
          )}
          <View className="h-4" />
        </ScrollView>
      )}

      {/* Create Thread Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowCreate(false)} />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-900 font-bold text-lg">새 토론 시작</Text>
            <TouchableOpacity onPress={() => { setShowCreate(false); setLinkedBill(null); }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Linked-bill chip */}
          {linkedBill && (
            <View className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 mb-3 flex-row items-center">
              <Ionicons name="document-text" size={14} color="#4F46E5" />
              <Text className="text-indigo-700 text-xs font-semibold ml-2 flex-1" numberOfLines={1}>
                {linkedBill.title} 에 태깅
              </Text>
              <TouchableOpacity onPress={() => setLinkedBill(null)}>
                <Ionicons name="close-circle" size={18} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          )}

          {/* Toxicity error */}
          {createError && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex-row items-start">
              <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginTop: 1, marginRight: 8 }} />
              <Text className="text-red-600 text-xs leading-5 flex-1">{createError}</Text>
            </View>
          )}

          {/* Category + Region row */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-slate-500 text-xs font-medium mb-1.5">카테고리</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                  {CATEGORIES.filter((c) => c !== "전체").map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setNewCategory(c)}
                      className={`px-3 py-1.5 rounded-full border ${
                        newCategory === c
                          ? "bg-primary-600 border-primary-600"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${newCategory === c ? "text-white" : "text-slate-500"}`}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Region */}
          <View className="mb-3">
            <Text className="text-slate-500 text-xs font-medium mb-1.5">
              지역 <Text className="text-slate-400">— '전체' 선택 시 지역 무관 토론으로 표시됩니다</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1.5">
                {REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewRegion(r)}
                    className={`px-3 py-1.5 rounded-full border ${
                      newRegion === r
                        ? "bg-slate-800 border-slate-800"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${newRegion === r ? "text-white" : "text-slate-500"}`}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Title */}
          <TextInput
            className="bg-slate-50 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium mb-3 border border-slate-200"
            placeholder="토론 제목을 입력하세요"
            placeholderTextColor="#94A3B8"
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={100}
          />

          {/* Body */}
          <TextInput
            className="bg-slate-50 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4 border border-slate-200"
            placeholder="논리적이고 건설적인 의견을 작성해주세요. (Gemini AI가 내용을 검토합니다)"
            placeholderTextColor="#94A3B8"
            value={newBody}
            onChangeText={setNewBody}
            multiline
            numberOfLines={5}
            style={{ height: 120, textAlignVertical: "top" }}
          />

          {/* AI notice */}
          <View className="flex-row items-center bg-blue-50 rounded-xl px-3 py-2.5 mb-4">
            <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
            <Text className="text-blue-700 text-xs ml-2 flex-1">
              Gemini AI가 게시 전 내용을 검토합니다. 건설적이지 않은 표현은 게시가 제한됩니다.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting || !newTitle.trim() || !newBody.trim()}
            className={`rounded-2xl py-4 items-center ${
              submitting || !newTitle.trim() || !newBody.trim()
                ? "bg-slate-200"
                : "bg-primary-600"
            }`}
          >
            {submitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-bold">AI 검토 중...</Text>
              </View>
            ) : (
              <Text className={`font-bold text-base ${!newTitle.trim() || !newBody.trim() ? "text-slate-400" : "text-white"}`}>
                게시하기
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

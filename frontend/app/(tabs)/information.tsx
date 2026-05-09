import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { ApiError, apiFetch } from "@/constants/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bill {
  id: string;
  bill_no: string;
  title: string;
  category: string;
  proposer: string;
  propose_date: string;
  status: string;
  raw_text: string;
}

interface BillSummary {
  bill_id: string;
  title: string;
  bullets: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ["청년", "교육", "경제", "복지", "환경", "주거", "고용", "보건", "기타"];

const CATEGORY_COLORS: Record<string, { pill: string; text: string; dot: string }> = {
  청년:  { pill: "bg-blue-50",    text: "text-blue-600",   dot: "bg-blue-400" },
  교육:  { pill: "bg-purple-50",  text: "text-purple-600", dot: "bg-purple-400" },
  경제:  { pill: "bg-amber-50",   text: "text-amber-600",  dot: "bg-amber-400" },
  복지:  { pill: "bg-green-50",   text: "text-green-600",  dot: "bg-green-400" },
  환경:  { pill: "bg-emerald-50", text: "text-emerald-600",dot: "bg-emerald-400" },
  주거:  { pill: "bg-orange-50",  text: "text-orange-600", dot: "bg-orange-400" },
  고용:  { pill: "bg-red-50",     text: "text-red-500",    dot: "bg-red-400" },
  보건:  { pill: "bg-pink-50",    text: "text-pink-600",   dot: "bg-pink-400" },
  기타:  { pill: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
};

const STATUS_COLORS: Record<string, string> = {
  "정부 입법예고": "text-amber-600",
  "소관위 심사":  "text-blue-600",
  "국회 계류":    "text-slate-500",
  "국회 심의":    "text-purple-600",
  "공청회 예정":  "text-green-600",
  "입법예고":     "text-orange-600",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryPill({ cat, selected, onToggle }: { cat: string; selected: boolean; onToggle: () => void }) {
  const c = CATEGORY_COLORS[cat] ?? { pill: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center px-3 py-1.5 rounded-full border mr-2 mb-2 ${
        selected ? `${c.pill} border-transparent` : "bg-white border-slate-200"
      }`}
      activeOpacity={0.7}
    >
      {selected && <View className={`w-1.5 h-1.5 rounded-full ${c.dot} mr-1.5`} />}
      <Text className={`text-xs font-semibold ${selected ? c.text : "text-slate-500"}`}>{cat}</Text>
      {selected && (
        <Ionicons name="close" size={12} color="#94A3B8" style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-start mb-1.5">
      <View className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 mr-2 flex-shrink-0" />
      <Text className="text-slate-600 text-xs leading-5 flex-1">{text}</Text>
    </View>
  );
}

function BillCard({
  bill,
  summary,
  loadingSummary,
  onSummarize,
  onFindDebates,
  onCreateDebate,
  onOpenDetail,
}: {
  bill: Bill;
  summary: BillSummary | null;
  loadingSummary: boolean;
  onSummarize: () => void;
  onFindDebates: () => void;
  onCreateDebate: () => void;
  onOpenDetail: () => void;
}) {
  const c = CATEGORY_COLORS[bill.category] ?? { pill: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  const statusColor = STATUS_COLORS[bill.status] ?? "text-slate-500";

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100">
      {/* Tap on the body region (top → raw_text) opens detail */}
      <TouchableOpacity onPress={onOpenDetail} activeOpacity={0.7}>
        {/* Top row */}
        <View className="flex-row items-center mb-2">
          <View className={`${c.pill} rounded-lg px-2.5 py-1`}>
            <Text className={`${c.text} text-xs font-semibold`}>{bill.category}</Text>
          </View>
          <View className="ml-2 bg-slate-50 rounded-lg px-2.5 py-1">
            <Text className={`text-xs font-medium ${statusColor}`}>{bill.status}</Text>
          </View>
          <Text className="text-slate-400 text-xs ml-auto">{bill.propose_date}</Text>
        </View>

        {/* Title */}
        <Text className="text-slate-900 font-bold text-sm leading-5 mb-1" numberOfLines={2}>
          {bill.title}
        </Text>
        <View className="flex-row items-center mb-3">
          <Text className="text-slate-400 text-xs flex-1">
            발의자: {bill.proposer} · 법안번호 {bill.bill_no}
          </Text>
          <Text className="text-primary-600 text-xs font-semibold">자세히 →</Text>
        </View>
      </TouchableOpacity>

      {/* Gemini summary section */}
      <View className="bg-slate-50 rounded-xl p-3">
        <View className="flex-row items-center mb-2">
          <Text className="text-xs font-bold text-slate-700">✨ Gemini AI 요약</Text>
          {!summary && !loadingSummary && (
            <TouchableOpacity
              onPress={onSummarize}
              className="ml-auto bg-primary-600 rounded-lg px-3 py-1"
            >
              <Text className="text-white text-xs font-semibold">요약하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingSummary && (
          <View className="flex-row items-center py-2">
            <ActivityIndicator size="small" color="#2563EB" />
            <Text className="text-slate-400 text-xs ml-2">AI가 분석 중입니다...</Text>
          </View>
        )}

        {summary && summary.bullets.map((b, i) => (
          <BulletRow key={i} text={b} />
        ))}

        {!summary && !loadingSummary && (
          <Text className="text-slate-400 text-xs">버튼을 눌러 AI 요약을 확인하세요.</Text>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row mt-3 gap-2">
        <TouchableOpacity
          onPress={onCreateDebate}
          className="flex-1 bg-primary-600 rounded-xl py-2 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white text-xs font-semibold">💬 토론하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onFindDebates}
          className="flex-1 border border-primary-300 rounded-xl py-2 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-primary-600 text-xs font-semibold">🔍 토론 찾기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function InformationScreen() {
  const { pinnedCategories, toggleCategory } = useUserPreferences();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  // bills keyed by category
  const [bills, setBills] = useState<Record<string, Bill[]>>({});
  const [loadingBills, setLoadingBills] = useState<Record<string, boolean>>({});

  // summaries keyed by bill id
  const [summaries, setSummaries] = useState<Record<string, BillSummary>>({});
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({});

  const [offline, setOffline] = useState(false);

  // Government API refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Fetch bills for a category (idempotent unless force=true)
  const fetchBills = useCallback(async (cat: string, force = false) => {
    if (!force && bills[cat] !== undefined) return;
    setLoadingBills((prev) => ({ ...prev, [cat]: true }));
    try {
      const data = await apiFetch<Bill[]>(`/policies?category=${encodeURIComponent(cat)}`);
      setBills((prev) => ({ ...prev, [cat]: data }));
      setOffline(false);
    } catch {
      setBills((prev) => ({ ...prev, [cat]: [] }));
      setOffline(true);
    } finally {
      setLoadingBills((prev) => ({ ...prev, [cat]: false }));
    }
  }, [bills]);

  // Refresh from government Open API → upsert → re-fetch all pinned categories
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const result = await apiFetch<{ inserted: number; updated: number; total: number }>(
        "/policies/refresh",
        { method: "POST" },
      );
      setRefreshMsg({
        kind: "ok",
        text: `총 ${result.total}건 동기화 완료 (신규 ${result.inserted}, 업데이트 ${result.updated})`,
      });
      // Force re-fetch every category currently in cache
      const cats = Object.keys(bills);
      cats.forEach((cat) => fetchBills(cat, true));
    } catch (err) {
      let msg = "정부 API 호출 실패. 서버 로그를 확인해주세요.";
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string })?.detail;
        if (detail) msg = detail;
      }
      setRefreshMsg({ kind: "error", text: msg });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 5000);
    }
  }, [refreshing, bills, fetchBills]);

  // Re-fetch whenever pinned categories change
  useEffect(() => {
    pinnedCategories.forEach((cat) => fetchBills(cat));
  }, [pinnedCategories, fetchBills]);

  const handleSummarize = useCallback(async (bill: Bill) => {
    if (summaries[bill.id] || loadingSummary[bill.id]) return;
    setLoadingSummary((prev) => ({ ...prev, [bill.id]: true }));
    try {
      const data = await apiFetch<BillSummary>(`/policies/${bill.id}/summarize`, {
        method: "POST",
      });
      setSummaries((prev) => ({ ...prev, [bill.id]: data }));
    } catch {
      setSummaries((prev) => ({
        ...prev,
        [bill.id]: {
          bill_id: bill.id,
          title: bill.title,
          bullets: [
            "서버에 연결할 수 없어 AI 요약을 불러오지 못했습니다.",
            "백엔드가 실행 중인지 확인해주세요.",
            `uvicorn main:app --reload (포트 8000)`,
          ],
        },
      }));
    } finally {
      setLoadingSummary((prev) => ({ ...prev, [bill.id]: false }));
    }
  }, [summaries, loadingSummary]);

  const openPicker = () => {
    setTempSelected([...pinnedCategories]);
    setShowPicker(true);
  };

  const applyPicker = () => {
    const toAdd = tempSelected.filter((c) => !pinnedCategories.includes(c));
    const toRemove = pinnedCategories.filter((c) => !tempSelected.includes(c));
    toAdd.forEach(toggleCategory);
    toRemove.forEach(toggleCategory);
    setShowPicker(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-5 pt-2 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">정책 피드</Text>
          <View className="flex-row items-center gap-2">
            {offline && (
              <View className="flex-row items-center bg-amber-50 rounded-lg px-2.5 py-1">
                <Ionicons name="cloud-offline-outline" size={12} color="#D97706" />
                <Text className="text-amber-600 text-xs font-medium ml-1">오프라인</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              className={`flex-row items-center rounded-lg px-3 py-1.5 ${
                refreshing ? "bg-slate-100" : "bg-primary-50 border border-primary-200"
              }`}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="refresh" size={13} color="#2563EB" />
              )}
              <Text className="text-primary-600 text-xs font-semibold ml-1.5">
                {refreshing ? "동기화 중..." : "정부 데이터"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Refresh result toast */}
        {refreshMsg && (
          <View
            className={`mt-2 rounded-lg px-3 py-2 flex-row items-center ${
              refreshMsg.kind === "ok" ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <Ionicons
              name={refreshMsg.kind === "ok" ? "checkmark-circle" : "alert-circle"}
              size={13}
              color={refreshMsg.kind === "ok" ? "#16A34A" : "#EF4444"}
            />
            <Text
              className={`text-xs font-medium ml-1.5 flex-1 ${
                refreshMsg.kind === "ok" ? "text-green-700" : "text-red-600"
              }`}
            >
              {refreshMsg.text}
            </Text>
          </View>
        )}

        {/* Pinned category chips + add button */}
        <View className="flex-row flex-wrap mt-3 items-center">
          {pinnedCategories.map((cat) => (
            <CategoryPill
              key={cat}
              cat={cat}
              selected
              onToggle={() => toggleCategory(cat)}
            />
          ))}
          <TouchableOpacity
            onPress={openPicker}
            className="flex-row items-center bg-slate-100 rounded-full px-3 py-1.5 mr-2 mb-2"
          >
            <Ionicons name="add" size={14} color="#64748B" />
            <Text className="text-slate-500 text-xs font-semibold ml-1">관심 분야 추가</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      {pinnedCategories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-4xl mb-4">📌</Text>
          <Text className="text-slate-700 font-bold text-base text-center mb-2">
            관심 분야를 선택해주세요
          </Text>
          <Text className="text-slate-400 text-sm text-center">
            위의 '관심 분야 추가' 버튼을 눌러 원하는 정책 카테고리를 추가하세요.
          </Text>
          <TouchableOpacity
            onPress={openPicker}
            className="mt-5 bg-primary-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-bold">분야 선택하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-4">
          {pinnedCategories.map((cat) => {
            const catBills = bills[cat] ?? [];
            const isLoading = loadingBills[cat];
            const c = CATEGORY_COLORS[cat] ?? { pill: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };

            return (
              <View key={cat} className="mb-2">
                <View className="flex-row items-center mb-3">
                  <View className={`w-2 h-2 rounded-full ${c.dot} mr-2`} />
                  <Text className="text-slate-800 font-bold text-sm">{cat} 관련 법안</Text>
                  {isLoading && <ActivityIndicator size="small" color="#94A3B8" style={{ marginLeft: 8 }} />}
                </View>

                {isLoading && catBills.length === 0 ? (
                  <View className="bg-white rounded-2xl p-6 mb-3 items-center border border-slate-100">
                    <ActivityIndicator color="#2563EB" />
                    <Text className="text-slate-400 text-xs mt-2">법안 불러오는 중...</Text>
                  </View>
                ) : catBills.length === 0 ? (
                  <View className="bg-white rounded-2xl p-5 mb-3 items-center border border-slate-100">
                    <Text className="text-slate-400 text-sm">해당 분야의 법안이 없습니다.</Text>
                  </View>
                ) : (
                  catBills.map((bill) => (
                    <BillCard
                      key={bill.id}
                      bill={bill}
                      summary={summaries[bill.id] ?? null}
                      loadingSummary={!!loadingSummary[bill.id]}
                      onSummarize={() => handleSummarize(bill)}
                      onOpenDetail={() => router.push(`/bill/${bill.id}` as any)}
                      onFindDebates={() =>
                        router.push({
                          pathname: "/(tabs)/debate" as any,
                          params: { bill_id: bill.id, bill_title: bill.title },
                        })
                      }
                      onCreateDebate={() =>
                        router.push({
                          pathname: "/(tabs)/debate" as any,
                          params: {
                            bill_id: bill.id,
                            bill_title: bill.title,
                            bill_category: bill.category,
                            create: "1",
                          },
                        })
                      }
                    />
                  ))
                )}
              </View>
            );
          })}
          <View className="h-6" />
        </ScrollView>
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setShowPicker(false)}
        />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-900 font-bold text-lg">관심 분야 선택</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-sm mb-4">
            법안·정책 피드를 받고 싶은 분야를 선택하세요.
          </Text>

          <View className="flex-row flex-wrap mb-6">
            {ALL_CATEGORIES.map((cat) => {
              const sel = tempSelected.includes(cat);
              const c = CATEGORY_COLORS[cat] ?? { pill: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() =>
                    setTempSelected((prev) =>
                      sel ? prev.filter((c) => c !== cat) : [...prev, cat]
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl border mr-2 mb-2 flex-row items-center ${
                    sel ? `${c.pill} border-transparent` : "bg-white border-slate-200"
                  }`}
                >
                  {sel && (
                    <Ionicons name="checkmark-circle" size={14} color="#2563EB" style={{ marginRight: 5 }} />
                  )}
                  <Text className={`font-semibold text-sm ${sel ? c.text : "text-slate-500"}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={applyPicker}
            className="bg-primary-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold text-base">
              적용하기 ({tempSelected.length}개 선택)
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

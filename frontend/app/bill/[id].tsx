import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  description: string | null;
  key_points: string[];
  pros: string[];
  cons: string[];
  expected_impact: string | null;
  sponsor_party: string | null;
  related_url: string | null;
}

interface BillSummary {
  bill_id: string;
  title: string;
  bullets: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { pill: string; text: string; dot: string }> = {
  청년:  { pill: "bg-blue-50",    text: "text-blue-600",   dot: "bg-blue-400" },
  교육:  { pill: "bg-purple-50",  text: "text-purple-600", dot: "bg-purple-400" },
  경제:  { pill: "bg-amber-50",   text: "text-amber-600",  dot: "bg-amber-400" },
  복지:  { pill: "bg-green-50",   text: "text-green-600",  dot: "bg-green-400" },
  환경:  { pill: "bg-emerald-50", text: "text-emerald-600",dot: "bg-emerald-400" },
  주거:  { pill: "bg-orange-50",  text: "text-orange-600", dot: "bg-orange-400" },
  고용:  { pill: "bg-red-50",     text: "text-red-500",    dot: "bg-red-400" },
  보건:  { pill: "bg-pink-50",    text: "text-pink-600",   dot: "bg-pink-400" },
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

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <Text className="text-base mr-2">{icon}</Text>
      <Text className="text-slate-900 text-base font-bold">{title}</Text>
    </View>
  );
}

function BulletList({ items, dotColor }: { items: string[]; dotColor: string }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} className="flex-row items-start mb-2">
          <View
            className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-2 mr-2.5 flex-shrink-0`}
          />
          <Text className="text-slate-700 text-sm leading-6 flex-1">{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [bill, setBill] = useState<Bill | null>(null);
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [loadingBill, setLoadingBill] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiFetch<Bill>(`/policies/${id}`)
      .then((data) => { if (!cancelled) setBill(data); })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setError("법안을 찾을 수 없습니다");
          } else {
            setError("법안을 불러오지 못했습니다");
          }
        }
      })
      .finally(() => { if (!cancelled) setLoadingBill(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleSummarize = async () => {
    if (!bill || summary || loadingSummary) return;
    setLoadingSummary(true);
    try {
      const data = await apiFetch<BillSummary>(`/policies/${bill.id}/summarize`, {
        method: "POST",
      });
      setSummary(data);
    } catch {
      setSummary({
        bill_id: bill.id, title: bill.title,
        bullets: ["AI 요약을 불러오지 못했습니다.", "백엔드 서버 또는 GEMINI_API_KEY 설정을 확인해주세요.", ""],
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAnalyze = async (force = false) => {
    if (!bill || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const updated = await apiFetch<Bill>(
        `/policies/${bill.id}/analyze${force ? "?force=true" : ""}`,
        // 그라운딩 검색은 일반 호출보다 오래 걸리므로 60초까지 허용
        { method: "POST", timeout: 60_000 },
      );
      setBill(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string })?.detail;
        setAnalyzeError(detail ?? "AI 분석 생성에 실패했습니다.");
      } else {
        setAnalyzeError("연결에 실패했습니다. 백엔드 상태를 확인해주세요.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFindDebates = () => {
    if (!bill) return;
    router.push({
      pathname: "/(tabs)/debate" as any,
      params: { bill_id: bill.id, bill_title: bill.title },
    });
  };

  const handleCreateDebate = () => {
    if (!bill) return;
    router.push({
      pathname: "/(tabs)/debate" as any,
      params: {
        bill_id: bill.id,
        bill_title: bill.title,
        bill_category: bill.category,
        create: "1",
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingBill) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#2563EB" size="large" />
        <Text className="text-slate-400 text-sm mt-3">법안 정보를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (error || !bill) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-row items-center px-4 pt-2 pb-3 bg-white border-b border-slate-200">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full items-center justify-center mr-2">
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="alert-circle-outline" size={40} color="#94A3B8" />
          <Text className="text-slate-500 text-sm mt-3 text-center">{error ?? "오류가 발생했습니다"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = CATEGORY_COLORS[bill.category] ?? { pill: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  const statusColor = STATUS_COLORS[bill.status] ?? "text-slate-500";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="flex-row items-center px-3 pt-2 pb-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#334155" />
        </TouchableOpacity>
        <Text className="ml-1 text-slate-900 font-bold text-base flex-1" numberOfLines={1}>
          법안 상세
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Hero */}
        <View className="bg-white px-5 pt-5 pb-5 border-b border-slate-100">
          <View className="flex-row items-center mb-3">
            <View className={`${c.pill} rounded-lg px-2.5 py-1`}>
              <Text className={`${c.text} text-xs font-semibold`}>{bill.category}</Text>
            </View>
            <View className="ml-2 bg-slate-50 rounded-lg px-2.5 py-1">
              <Text className={`text-xs font-medium ${statusColor}`}>{bill.status}</Text>
            </View>
          </View>

          <Text className="text-slate-900 text-xl font-bold leading-7 mb-2">
            {bill.title}
          </Text>

          <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1">
            <Text className="text-slate-500 text-xs">법안번호 {bill.bill_no}</Text>
            <Text className="text-slate-500 text-xs">발의일 {bill.propose_date}</Text>
          </View>

          {/* Proposer card */}
          <View className="mt-4 bg-slate-50 rounded-xl p-3">
            <Text className="text-slate-400 text-xs mb-1">발의자</Text>
            <Text className="text-slate-700 text-sm font-semibold">
              {bill.proposer}
            </Text>
            {bill.sponsor_party && (
              <Text className="text-slate-500 text-xs mt-0.5">{bill.sponsor_party}</Text>
            )}
          </View>
        </View>

        {/* ── AI Analysis CTA — shown when no description yet ── */}
        {!bill.description && (
          <View className="bg-white mx-4 mt-4 rounded-2xl p-5 border border-primary-100">
            <View className="flex-row items-start mb-3">
              <Text className="text-2xl mr-2">🤖</Text>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm mb-1">
                  AI 상세 분석이 아직 없습니다
                </Text>
                <Text className="text-slate-500 text-xs leading-5">
                  Gemini가 정책 배경, 핵심 조항, 찬성·반대 논거, 예상 영향을 분석해드립니다.
                </Text>
              </View>
            </View>

            {analyzeError && (
              <View className="bg-red-50 rounded-lg px-3 py-2 mb-3">
                <Text className="text-red-600 text-xs">{analyzeError}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleAnalyze(false)}
              disabled={analyzing}
              className={`rounded-xl py-3 items-center flex-row justify-center ${
                analyzing ? "bg-slate-200" : "bg-primary-600"
              }`}
              activeOpacity={0.85}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#2563EB" size="small" />
                  <Text className="text-slate-600 text-sm font-semibold ml-2">
                    AI 분석 중... (최대 1분)
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={14} color="white" />
                  <Text className="text-white text-sm font-bold ml-1.5">
                    AI 상세 분석 생성
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="text-slate-400 text-[10px] text-center mt-2 leading-4">
              ⓘ Google 검색 그라운딩 기반 — 검색 결과가 부족한 경우{"\n"}
              실제 제안이유와 다를 수 있습니다.
            </Text>
          </View>
        )}

        {/* Description */}
        {bill.description && (
          <View className="bg-white mx-4 mt-4 rounded-2xl p-5 border border-slate-100">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">📋</Text>
                <Text className="text-slate-900 text-base font-bold">정책 배경 및 취지</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleAnalyze(true)}
                disabled={analyzing}
                className="flex-row items-center bg-slate-50 rounded-lg px-2 py-1"
                activeOpacity={0.7}
              >
                {analyzing ? (
                  <ActivityIndicator color="#94A3B8" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={11} color="#64748B" />
                    <Text className="text-slate-500 text-[10px] font-medium ml-1">재생성</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-slate-700 text-sm leading-6">{bill.description}</Text>
          </View>
        )}

        {/* Key points */}
        {bill.key_points && bill.key_points.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-5 border border-slate-100">
            <SectionTitle icon="📌" title="핵심 조항" />
            <BulletList items={bill.key_points} dotColor={c.dot} />
          </View>
        )}

        {/* Pros & Cons */}
        {((bill.pros && bill.pros.length > 0) || (bill.cons && bill.cons.length > 0)) && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-5 border border-slate-100">
            <SectionTitle icon="⚖️" title="주요 쟁점" />

            {bill.pros && bill.pros.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-50 rounded-lg px-2 py-0.5">
                    <Text className="text-blue-600 text-xs font-bold">찬성 논거</Text>
                  </View>
                </View>
                <BulletList items={bill.pros} dotColor="bg-blue-500" />
              </View>
            )}

            {bill.cons && bill.cons.length > 0 && (
              <View>
                <View className="flex-row items-center mb-2">
                  <View className="bg-red-50 rounded-lg px-2 py-0.5">
                    <Text className="text-red-500 text-xs font-bold">반대 논거</Text>
                  </View>
                </View>
                <BulletList items={bill.cons} dotColor="bg-red-400" />
              </View>
            )}
          </View>
        )}

        {/* Expected impact */}
        {bill.expected_impact && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-5 border border-slate-100">
            <SectionTitle icon="📊" title="예상 영향" />
            <Text className="text-slate-700 text-sm leading-6">{bill.expected_impact}</Text>
          </View>
        )}

        {/* Gemini AI summary */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-5 border border-slate-100">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Text className="text-base mr-2">✨</Text>
              <Text className="text-slate-900 text-base font-bold">Gemini AI 3줄 요약</Text>
            </View>
            {!summary && !loadingSummary && (
              <TouchableOpacity
                onPress={handleSummarize}
                className="bg-primary-600 rounded-lg px-3 py-1.5"
                activeOpacity={0.8}
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

          {summary && (
            <BulletList
              items={summary.bullets.filter((b) => b.trim().length > 0)}
              dotColor="bg-primary-500"
            />
          )}

          {!summary && !loadingSummary && (
            <Text className="text-slate-400 text-xs">버튼을 눌러 핵심을 3줄로 요약해보세요.</Text>
          )}
        </View>

        {/* Original text */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-5 border border-slate-100">
          <SectionTitle icon="📄" title="법안 원문" />
          <Text className="text-slate-600 text-xs leading-5">{bill.raw_text}</Text>
          {bill.related_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(bill.related_url!).catch(() => {})}
              className="flex-row items-center mt-3 self-start bg-slate-50 rounded-lg px-3 py-2"
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={13} color="#64748B" />
              <Text className="text-slate-600 text-xs font-medium ml-1.5">국회 의안정보 보기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2 mx-4 mt-4 mb-8">
          <TouchableOpacity
            onPress={handleCreateDebate}
            className="flex-1 bg-primary-600 rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">💬 토론하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFindDebates}
            className="flex-1 border border-primary-300 rounded-2xl py-4 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-primary-600 font-bold text-sm">🔍 토론 찾기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

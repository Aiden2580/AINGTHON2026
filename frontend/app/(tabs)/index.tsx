import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { apiFetch } from "@/constants/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ElectionEvent {
  id: string;
  name: string;
  date: string;
  type: string;
  days_left: number;
  description: string;
  region: string;
  color: string;
}

interface Debate {
  id: number;
  title: string;
  category: string;
  author_name: string;
  university: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
}

interface Bill {
  id: string;
  bill_no: string;
  title: string;
  category: string;
  proposer: string;
  propose_date: string;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  ministry: string;
  date: string;
  url: string;
}

// ── Color maps ───────────────────────────────────────────────────────────────

const ELECTION_STYLE: Record<string, { bg: string; badge: string; badgeText: string }> = {
  amber: { bg: "bg-amber-500",   badge: "bg-amber-100", badgeText: "text-amber-700" },
  slate: { bg: "bg-slate-600",   badge: "bg-slate-200", badgeText: "text-slate-700" },
  blue:  { bg: "bg-primary-600", badge: "bg-blue-100",  badgeText: "text-blue-700"  },
  green: { bg: "bg-green-600",   badge: "bg-green-100", badgeText: "text-green-700" },
  red:   { bg: "bg-red-600",     badge: "bg-red-100",   badgeText: "text-red-700"   },
};

const CATEGORY_COLORS: Record<string, { pill: string; text: string }> = {
  청년: { pill: "bg-blue-50",    text: "text-blue-600" },
  교육: { pill: "bg-purple-50",  text: "text-purple-600" },
  경제: { pill: "bg-amber-50",   text: "text-amber-600" },
  복지: { pill: "bg-green-50",   text: "text-green-600" },
  환경: { pill: "bg-emerald-50", text: "text-emerald-600" },
  주거: { pill: "bg-orange-50",  text: "text-orange-600" },
  고용: { pill: "bg-red-50",     text: "text-red-500" },
  보건: { pill: "bg-pink-50",    text: "text-pink-600" },
  정책: { pill: "bg-indigo-50",  text: "text-indigo-600" },
  선거: { pill: "bg-amber-50",   text: "text-amber-600" },
  기타: { pill: "bg-slate-100",  text: "text-slate-600" },
};

// ── Auto-scroll constants ────────────────────────────────────────────────────

// 카드 너비를 화면의 약 절반으로 지정 → 한 번에 약 2장 노출
const CARD_WIDTH      = 165;
const CARD_GAP        = 10;
const SCROLL_AREA_PAD = 20;

// ── Subcomponents ────────────────────────────────────────────────────────────

function ElectionCard({ event }: { event: ElectionEvent }) {
  const s = ELECTION_STYLE[event.color] ?? ELECTION_STYLE.blue;
  const urgent = event.days_left > 0 && event.days_left <= 7;

  return (
    <View
      className={`${s.bg} rounded-2xl px-4 py-3`}
      style={{ width: CARD_WIDTH, marginRight: CARD_GAP }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className={`${s.badge} rounded-md px-1.5 py-0.5`}>
          <Text className={`${s.badgeText} text-[10px] font-bold`}>{event.type}</Text>
        </View>
        {urgent && <Ionicons name="alert-circle" size={12} color="rgba(255,255,255,0.85)" />}
      </View>

      <Text className="text-white font-black text-2xl mb-0.5">
        {event.days_left === 0 ? "D-day" : `D-${event.days_left}`}
      </Text>

      <Text className="text-white font-bold text-xs leading-[15px]" numberOfLines={2}>
        {event.name}
      </Text>
      <Text className="text-white/70 text-[10px] mt-1">
        {event.date.slice(5).replace("-", ".")}
      </Text>
    </View>
  );
}

function TrendingCard({ debate, rank, onPress }: { debate: Debate; rank: number; onPress: () => void }) {
  const c = CATEGORY_COLORS[debate.category] ?? { pill: "bg-slate-100", text: "text-slate-600" };
  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 flex-row items-start"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text className={`text-2xl font-black mr-3 mt-0.5 ${rankColors[rank] ?? "text-slate-300"}`}>
        {rank + 1}
      </Text>
      <View className="flex-1">
        <View className="flex-row items-center mb-1.5">
          <View className={`${c.pill} rounded-lg px-2 py-0.5`}>
            <Text className={`${c.text} text-xs font-semibold`}>{debate.category}</Text>
          </View>
          <View className="flex-row items-center ml-auto">
            <View className="w-4 h-4 rounded-full bg-primary-100 items-center justify-center mr-1">
              <Text className="text-primary-600 text-xs font-bold">{debate.university[0]}</Text>
            </View>
            <Text className="text-slate-400 text-xs">{debate.university}</Text>
          </View>
        </View>
        <Text className="text-slate-900 font-bold text-sm leading-5 mb-2" numberOfLines={2}>
          {debate.title}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center">
            <Ionicons name="arrow-up" size={13} color="#2563EB" />
            <Text className="text-primary-600 text-xs font-bold ml-1">{debate.upvotes}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={12} color="#94A3B8" />
            <Text className="text-slate-500 text-xs ml-1">{debate.comment_count}개 댓글</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BillCard({ bill, onPress }: { bill: Bill; onPress: () => void }) {
  const c = CATEGORY_COLORS[bill.category] ?? CATEGORY_COLORS["기타"];
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-100"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="flex-row items-center mb-2">
        <View className={`${c.pill} rounded-lg px-2 py-0.5`}>
          <Text className={`${c.text} text-xs font-semibold`}>{bill.category}</Text>
        </View>
        <Text className="text-slate-400 text-xs ml-2">{bill.status}</Text>
        <Text className="text-slate-400 text-xs ml-auto">{bill.propose_date}</Text>
      </View>
      <Text className="text-slate-900 font-bold text-sm leading-5 mb-1" numberOfLines={2}>
        {bill.title}
      </Text>
      <Text className="text-slate-400 text-xs">발의: {bill.proposer}</Text>
    </TouchableOpacity>
  );
}

// 한 행의 시각적 높이를 명시: content 56 + marginBottom 8 = 64. 무한 루프 계산과 일치시킴.
const ROW_CONTENT_HEIGHT = 56;
const ROW_MARGIN          = 8;
const ROW_HEIGHT          = ROW_CONTENT_HEIGHT + ROW_MARGIN; // 64

function AnnouncementRow({ item, onPress }: { item: Announcement; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ height: ROW_CONTENT_HEIGHT, marginBottom: ROW_MARGIN }}
      className="bg-white rounded-xl px-3 py-2 border border-slate-100 justify-center"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="flex-row items-center mb-1">
        <View className="bg-indigo-50 rounded-md px-1.5 py-0.5">
          <Text className="text-indigo-600 text-[10px] font-semibold" numberOfLines={1}>
            {item.ministry}
          </Text>
        </View>
        <Text className="text-slate-400 text-[10px] ml-auto">{item.date}</Text>
      </View>
      <Text className="text-slate-800 text-xs font-medium leading-4" numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

// ── Vertical auto-scrolling announcement strip ───────────────────────────────

function AnnouncementStrip({
  items,
  onItemPress,
}: {
  items: Announcement[];
  onItemPress: (a: Announcement) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (items.length === 0) return;
    // 한 카드 높이가 ROW_HEIGHT 로 고정되어 있어 정확한 wrap 지점 계산 가능
    const totalHeight = items.length * ROW_HEIGHT;

    const interval = setInterval(() => {
      if (pausedRef.current) return;
      positionRef.current += 0.4; // px per tick → 약 13px/s 의 천천히 흐르는 속도
      if (positionRef.current >= totalHeight) {
        positionRef.current = 0;
      }
      scrollRef.current?.scrollTo({ y: positionRef.current, animated: false });
    }, 30);

    return () => clearInterval(interval);
  }, [items.length]);

  const handleBeginDrag = () => { pausedRef.current = true; };
  const handleEndDrag   = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    positionRef.current = e.nativeEvent.contentOffset.y;
    setTimeout(() => { pausedRef.current = false; }, 3000);
  };

  // 매끄러운 무한 루프를 위해 항목을 두 번 렌더
  const looped = [...items, ...items];

  return (
    <View
      style={{ height: 220 }}
      className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden mx-5"
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator
        onScrollBeginDrag={handleBeginDrag}
        onScrollEndDrag={handleEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {looped.map((a, idx) => (
          <AnnouncementRow
            key={`${a.id}-${idx}`}
            item={a}
            onPress={() => onItemPress(a)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Auto-scrolling election strip ────────────────────────────────────────────

function ElectionStrip({ events }: { events: ElectionEvent[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (events.length === 0) return;

    const totalWidth = events.length * (CARD_WIDTH + CARD_GAP);
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      positionRef.current += 0.6; // px per tick
      if (positionRef.current >= totalWidth) {
        positionRef.current = 0;
      }
      scrollRef.current?.scrollTo({ x: positionRef.current, animated: false });
    }, 30);

    return () => clearInterval(interval);
  }, [events.length]);

  const handleBeginDrag = () => {
    pausedRef.current = true;
  };

  const handleEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    positionRef.current = e.nativeEvent.contentOffset.x;
    // 사용자 조작 후 3초 대기 후 자동 스크롤 재개
    setTimeout(() => { pausedRef.current = false; }, 3000);
  };

  // 매끄러운 무한 스크롤 효과: 동일 카드 한 벌 더 렌더링
  const looped = [...events, ...events];

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SCROLL_AREA_PAD }}
      onScrollBeginDrag={handleBeginDrag}
      onScrollEndDrag={handleEndDrag}
      scrollEventThrottle={16}
    >
      {looped.map((ev, idx) => (
        <ElectionCard key={`${ev.id}-${idx}`} event={ev} />
      ))}
    </ScrollView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { pinnedCategories, homeWidgets, toggleHomeWidget } = useUserPreferences();
  const router = useRouter();

  const [elections,     setElections]     = useState<ElectionEvent[]>([]);
  const [trending,      setTrending]      = useState<Debate[]>([]);
  const [hotBills,      setHotBills]      = useState<Bill[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [offline,       setOffline]       = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [electionData, trendingData, billsData, annData] = await Promise.all([
          apiFetch<ElectionEvent[]>("/elections"),
          apiFetch<Debate[]>("/debates/trending?limit=3"),
          apiFetch<Bill[]>("/policies?").catch(() => [] as Bill[]),
          // 첫 호출은 korea.kr 라이브 스크래핑이라 늦어질 수 있어 15초 허용
          apiFetch<{ items: Announcement[] }>("/news/announcements?limit=6", { timeout: 15_000 })
            .catch(() => ({ items: [] })),
        ]);
        if (!cancelled) {
          setElections(electionData);
          setTrending(trendingData);
          // 최신 발의일 기준 정렬, 상위 4개
          const sortedBills = [...billsData].sort((a, b) =>
            (b.propose_date || "").localeCompare(a.propose_date || ""),
          );
          setHotBills(sortedBills.slice(0, 4));
          setAnnouncements(annData.items);
          setOffline(false);
        }
      } catch {
        if (!cancelled) {
          setElections([]); setTrending([]); setHotBills([]); setAnnouncements([]);
          setOffline(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const goToInfo  = () => router.push("/(tabs)/information" as any);
  const openThread = (id: number) => router.push(`/thread/${id}` as any);
  const openBill   = (id: string) => router.push(`/bill/${id}` as any);
  const openUrl    = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4 bg-white border-b border-slate-200">
        <View>
          <Text className="text-xs font-bold text-primary-600 tracking-widest uppercase">Agora</Text>
          <Text className="text-xl font-bold text-slate-900">국내 유일 대학생 정책 토론 플랫폼</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {offline && (
            <View className="bg-amber-50 rounded-full px-2.5 py-1 flex-row items-center">
              <Ionicons name="cloud-offline-outline" size={12} color="#D97706" />
              <Text className="text-amber-600 text-xs font-medium ml-1">오프라인</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowCustomize(true)}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <Ionicons name="options-outline" size={18} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">

        {/* Pinned Categories */}
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-900 text-sm font-bold">📌 내 관심 분야</Text>
            <TouchableOpacity onPress={goToInfo}>
              <Text className="text-primary-600 text-xs font-medium">편집 →</Text>
            </TouchableOpacity>
          </View>

          {pinnedCategories.length === 0 ? (
            <TouchableOpacity
              onPress={goToInfo}
              className="bg-white border border-dashed border-slate-200 rounded-2xl py-4 items-center"
            >
              <Ionicons name="add-circle-outline" size={22} color="#94A3B8" />
              <Text className="text-slate-400 text-xs mt-1">관심 분야를 추가해보세요</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pinnedCategories.map((cat) => {
                const c = CATEGORY_COLORS[cat] ?? { pill: "bg-slate-100", text: "text-slate-600" };
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={goToInfo}
                    className={`${c.pill} rounded-full px-4 py-2 mr-2`}
                  >
                    <Text className={`${c.text} text-xs font-bold`}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={goToInfo}
                className="bg-slate-100 rounded-full px-3 py-2 mr-2 flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#64748B" />
                <Text className="text-slate-500 text-xs font-semibold ml-1">추가</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Recent government announcements (korea.kr) — top customizable section, vertical auto-scroll */}
        {homeWidgets.announcements && (
          <View className="mt-2">
            <View className="flex-row items-center justify-between px-5 mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-slate-900 text-sm font-bold">📢 정부 발표</Text>
                <Text className="text-slate-400 text-[10px]">korea.kr · 자동 스크롤</Text>
              </View>
              <TouchableOpacity
                onPress={() => openUrl("https://www.korea.kr/briefing/pressReleaseList.do")}
              >
                <Text className="text-primary-600 text-xs font-medium">전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="mx-5 bg-white rounded-2xl p-6 items-center border border-slate-100">
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : announcements.length === 0 ? (
              <View className="mx-5 bg-white rounded-2xl p-5 items-center border border-slate-100">
                <Text className="text-slate-400 text-xs">정부 발표를 불러오지 못했습니다.</Text>
              </View>
            ) : (
              <AnnouncementStrip
                items={announcements}
                onItemPress={(a) => openUrl(a.url)}
              />
            )}
          </View>
        )}

        {/* Election Schedule (auto-scroll, ~2 cards visible) */}
        {homeWidgets.elections && (() => {
          // 본 투표일(2026-06-03)의 D-day는 elections 배열에서 가져옴
          const mainVote = elections.find((e) => e.date === "2026-06-03");
          const dDay = mainVote ? mainVote.days_left : null;
          return (
          <View className="mt-2">
            <View className="flex-row items-center justify-between px-5 mb-1">
              <Text className="text-slate-900 text-sm font-bold">🗓 선거 일정</Text>
              <Text className="text-slate-400 text-[10px]">자동 슬라이드</Text>
            </View>

            {/* Election context: 제9회 전국동시지방선거 */}
            <View className="mx-5 mb-3 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
              <View className="flex-row items-center mb-0.5">
                <Text className="text-primary-700 text-xs font-bold">🗳️ 제9회 전국동시지방선거</Text>
                {dDay !== null && (
                  <View className="bg-red-500 rounded-md px-1.5 py-0.5 ml-2">
                    <Text className="text-white text-[10px] font-black">
                      {dDay === 0 ? "D-day" : `D-${dDay}`}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-slate-600 text-[11px] leading-[15px]">
                2026년 6월 3일(수) 실시 — 광역단체장(시·도지사), 교육감, 시·도의원, 시·군·구의원 등을 선출하는 4년 주기의 전국 단위 선거입니다.
              </Text>
            </View>

            {loading ? (
              <View className="h-24 items-center justify-center">
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : elections.length === 0 ? (
              <View className="mx-5 bg-white rounded-2xl p-5 items-center border border-slate-100">
                <Text className="text-slate-400 text-xs">표시할 선거 일정이 없습니다.</Text>
              </View>
            ) : (
              <ElectionStrip events={elections} />
            )}
          </View>
          );
        })()}

        {/* Trending Debates */}
        {homeWidgets.trending && (
          <View className="mt-5 px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-900 text-sm font-bold">🔥 인기 토론 TOP 3</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/debate" as any)}>
                <Text className="text-primary-600 text-xs font-medium">전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : trending.length === 0 ? (
              <View className="bg-white rounded-2xl p-5 items-center border border-slate-100">
                <Text className="text-slate-400 text-xs">표시할 인기 토론이 없습니다.</Text>
              </View>
            ) : (
              trending.map((debate, index) => (
                <TrendingCard
                  key={debate.id}
                  debate={debate}
                  rank={index}
                  onPress={() => openThread(debate.id)}
                />
              ))
            )}
          </View>
        )}

        {/* Hot Bills (주요 법안) */}
        {homeWidgets.bills && (
          <View className="mt-3 px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-900 text-sm font-bold">📑 주요 법안</Text>
              <TouchableOpacity onPress={goToInfo}>
                <Text className="text-primary-600 text-xs font-medium">전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : hotBills.length === 0 ? (
              <View className="bg-white rounded-2xl p-5 items-center border border-slate-100">
                <Text className="text-slate-400 text-xs">표시할 법안이 없습니다.</Text>
              </View>
            ) : (
              hotBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} onPress={() => openBill(bill.id)} />
              ))
            )}
          </View>
        )}

        {/* If everything is hidden */}
        {!homeWidgets.elections && !homeWidgets.trending && !homeWidgets.bills && !homeWidgets.announcements && (
          <View className="items-center justify-center py-20 px-10">
            <Ionicons name="options-outline" size={36} color="#94A3B8" />
            <Text className="text-slate-500 text-sm mt-3 text-center">
              모든 섹션이 숨겨져 있습니다.{"\n"}맞춤 설정에서 표시할 정보를 선택해주세요.
            </Text>
            <TouchableOpacity
              onPress={() => setShowCustomize(true)}
              className="mt-4 bg-primary-600 rounded-xl px-5 py-2.5"
            >
              <Text className="text-white font-bold text-sm">맞춤 설정 열기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Customize Modal */}
      <Modal
        visible={showCustomize}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomize(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowCustomize(false)} />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-900 font-bold text-lg">홈 화면 맞춤 설정</Text>
            <TouchableOpacity onPress={() => setShowCustomize(false)}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-sm mb-4">
            홈에 표시할 섹션을 선택하세요. 순서는 위에서 아래 순입니다.
          </Text>

          {[
            { key: "announcements" as const, label: "📢  정부 발표",  desc: "정책브리핑 보도자료 (korea.kr, 자동 스크롤)" },
            { key: "elections"     as const, label: "🗓  선거 일정",  desc: "다가오는 선거 D-day (자동 슬라이드)" },
            { key: "trending"      as const, label: "🔥  인기 토론",  desc: "추천수 기준 토론 TOP 3" },
            { key: "bills"         as const, label: "📑  주요 법안",  desc: "최근 발의된 법안" },
          ].map((item) => (
            <View
              key={item.key}
              className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 mb-2"
            >
              <View className="flex-1">
                <Text className="text-slate-900 font-semibold text-sm">{item.label}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">{item.desc}</Text>
              </View>
              <Switch
                value={homeWidgets[item.key]}
                onValueChange={() => toggleHomeWidget(item.key)}
                trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={() => setShowCustomize(false)}
            className="bg-primary-600 rounded-2xl py-4 items-center mt-4"
          >
            <Text className="text-white font-bold text-base">완료</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ApiError, apiFetch } from "@/constants/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

const AGE_GROUPS = ["20대", "30대", "40대 이상"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LevelEntry {
  level: number;
  name: string;
  emoji: string;
  xp_min: number;
  xp_max: number | null;
}

interface LevelData {
  level: number;
  name: string;
  emoji: string;
  xp: number;
  xp_min: number;
  xp_max: number | null;
  xp_percent: number;
  xp_to_next: number;
  all_levels: LevelEntry[];
  stats: {
    threads_created: number;
    upvotes_received: number;
    comments_written: number;
    active_weeks: number;
  };
}

interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

interface BadgeData {
  badges: Badge[];
  unlocked_count: number;
  total: number;
}

interface HistoryItem {
  id: number;
  thread_id: number;
  type: "thread" | "comment";
  title: string;
  category: string;
  region: string;
  upvotes: number;
  date: string;
}

interface UserProfile {
  display_name: string;
  university:   string;
  major:        string;
  age_group:    string;
  created_at:   string;
}

type HistoryFilter = "all" | "thread" | "comment";

// ── Main component ────────────────────────────────────────────────────────────

export default function MyPageScreen() {
  const { isDark, toggleTheme } = useUserPreferences();
  const { logout } = useAuth();

  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  const [levelData,     setLevelData]     = useState<LevelData | null>(null);
  const [badges,        setBadges]        = useState<Badge[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [history,       setHistory]       = useState<HistoryItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [offline,       setOffline]       = useState(false);

  // History filter (전체 / 토론 / 댓글)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  // Edit profile modal
  const [showEdit,    setShowEdit]    = useState(false);
  const [editUni,     setEditUni]     = useState("");
  const [editMajor,   setEditMajor]   = useState("");
  const [editAge,     setEditAge]     = useState("20대");
  const [savingEdit,  setSavingEdit]  = useState(false);
  const [editError,   setEditError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<UserProfile>("/users/me"),
      apiFetch<LevelData>("/users/me/level"),
      apiFetch<BadgeData>("/users/me/badges"),
      apiFetch<{ history: HistoryItem[] }>("/users/me/history?limit=50"),
    ])
      .then(([prof, lvl, bdg, hist]) => {
        setProfile(prof);
        setLevelData(lvl);
        setBadges(bdg.badges);
        setUnlockedCount(bdg.unlocked_count);
        setHistory(hist.history);
        setOffline(false);
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login" as any);
  }

  function openEdit() {
    if (!profile) return;
    setEditUni(profile.university);
    setEditMajor(profile.major);
    setEditAge(profile.age_group ?? "20대");
    setEditError(null);
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    if (!editUni.trim() || !editMajor.trim()) {
      setEditError("학교와 전공을 모두 입력해주세요.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await apiFetch<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          university: editUni.trim(),
          major:      editMajor.trim(),
          age_group:  editAge,
        }),
      });
      setProfile(updated);
      setShowEdit(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string })?.detail;
        setEditError(detail ?? "프로필 저장에 실패했습니다.");
      } else {
        setEditError("연결에 실패했습니다. 서버 상태를 확인해주세요.");
      }
    } finally {
      setSavingEdit(false);
    }
  }

  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((h) => h.type === historyFilter);

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const bg        = isDark ? "bg-slate-900"  : "bg-slate-50";
  const cardBg    = isDark ? "bg-slate-800"  : "bg-white";
  const innerBg   = isDark ? "bg-slate-700"  : "bg-slate-50";
  const divider   = isDark ? "border-slate-700" : "border-slate-100";
  const textPri   = isDark ? "text-slate-100" : "text-slate-900";
  const textSec   = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const iconClr   = isDark ? "#94A3B8" : "#64748B";

  const currentLv = levelData?.level ?? 0;
  const stats     = levelData?.stats;

  const statItems: {
    label: string;
    value: string;
    icon: any;
    activityType: "thread" | "comment" | null;
  }[] = stats
    ? [
        { label: "작성 토론", value: String(stats.threads_created),  icon: "create-outline",     activityType: "thread"  },
        { label: "받은 공감", value: String(stats.upvotes_received), icon: "heart-outline",       activityType: null      },
        { label: "댓글",     value: String(stats.comments_written), icon: "chatbubble-outline",  activityType: "comment" },
        { label: "활동 주간", value: String(stats.active_weeks),     icon: "calendar-outline",    activityType: null      },
      ]
    : [];

  function handleStatTap(activityType: "thread" | "comment" | null) {
    if (!activityType) return;
    router.push({
      pathname: "/profile/activities" as any,
      params: { type: activityType },
    });
  }

  return (
    <SafeAreaView className={`flex-1 ${bg}`}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#0F172A" : "#F8FAFC"}
      />

      {/* ── Header ── */}
      <View className={`${cardBg} border-b ${divider} flex-row items-center justify-between px-5 pt-2 pb-4`}>
        <Text className={`text-xl font-bold ${textPri}`}>마이페이지</Text>
        {offline && (
          <View className="bg-amber-100 rounded-full px-3 py-1">
            <Text className="text-amber-700 text-xs font-medium">오프라인</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : !profile || !levelData ? (
          <View className="items-center justify-center py-20 px-8">
            <Ionicons name="cloud-offline-outline" size={40} color="#94A3B8" />
            <Text className={`${textSec} text-sm mt-3 text-center`}>
              서버에 연결할 수 없습니다.{"\n"}백엔드가 실행 중인지 확인해주세요.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Profile Card ── */}
            <View className={`${cardBg} mx-4 mt-4 rounded-2xl p-5 border ${divider}`}>
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center mr-4">
                  <Text className="text-white text-2xl font-bold">
                    {profile.display_name[0]}
                  </Text>
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`${textPri} text-lg font-bold mr-1`}>{profile.display_name}</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                  </View>
                  <Text className={`${textSec} text-sm mt-0.5`}>
                    {profile.university} · {profile.major}
                  </Text>
                  <Text className={`${textMuted} text-xs mt-0.5`}>
                    {new Date(profile.created_at).getFullYear()}년 가입
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={openEdit}
                  className={`border ${divider} rounded-xl px-3 py-1.5`}
                  activeOpacity={0.7}
                >
                  <Text className={`${textSec} text-xs font-medium`}>편집</Text>
                </TouchableOpacity>
              </View>

              {/* Level & XP */}
              <View className={`mt-4 ${innerBg} rounded-xl p-3`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className="text-blue-600 font-bold text-sm">
                      Lv.{levelData.level}
                    </Text>
                    <Text className={`${textPri} font-semibold text-sm ml-2`}>
                      {levelData.emoji} {levelData.name}
                    </Text>
                  </View>
                  <Text className={`${textMuted} text-xs`}>
                    {levelData.xp.toLocaleString()} XP
                  </Text>
                </View>

                <View
                  className="rounded-full overflow-hidden"
                  style={{ height: 8, backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }}
                >
                  <View
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${levelData.xp_percent}%` }}
                  />
                </View>

                {levelData.xp_to_next > 0 ? (
                  <Text className={`${textMuted} text-xs mt-1.5`}>
                    다음 레벨까지 {levelData.xp_to_next.toLocaleString()} XP
                  </Text>
                ) : (
                  <Text className="text-blue-600 text-xs font-semibold mt-1.5">
                    최고 레벨 달성! 🎉
                  </Text>
                )}
              </View>
            </View>

            {/* ── Stats Grid (작성 토론 / 댓글 → 전용 목록 화면으로 이동) ── */}
            <View className="flex-row flex-wrap mx-4 mt-4 gap-3">
              {statItems.map((stat) => {
                const isTappable = stat.activityType !== null;
                const Wrapper = isTappable ? TouchableOpacity : View;
                return (
                  <Wrapper
                    key={stat.label}
                    onPress={isTappable ? () => handleStatTap(stat.activityType) : undefined}
                    activeOpacity={0.7}
                    className={`flex-1 min-w-[40%] ${cardBg} rounded-2xl p-4 items-center border ${divider}`}
                  >
                    <Ionicons name={stat.icon} size={20} color="#2563EB" />
                    <Text className={`${textPri} text-xl font-bold mt-1`}>{stat.value}</Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className={`${textSec} text-xs`}>{stat.label}</Text>
                      {isTappable && (
                        <Ionicons name="chevron-forward" size={11} color={isDark ? "#475569" : "#CBD5E1"} style={{ marginLeft: 2 }} />
                      )}
                    </View>
                  </Wrapper>
                );
              })}
            </View>

            {/* ── Level Roadmap ── */}
            <View className={`${cardBg} mx-4 mt-4 rounded-2xl p-5 border ${divider}`}>
              <Text className={`${textPri} text-base font-bold mb-5`}>레벨 로드맵</Text>

              {/* Circles + connectors */}
              <View className="flex-row items-center">
                {levelData.all_levels.map((lv, idx) => {
                  const done = lv.level < currentLv;
                  const cur  = lv.level === currentLv;
                  return (
                    <React.Fragment key={lv.level}>
                      {idx > 0 && (
                        <View
                          style={{
                            flex: 1,
                            height: 2,
                            backgroundColor:
                              lv.level <= currentLv
                                ? "#2563EB"
                                : isDark ? "#334155" : "#E2E8F0",
                          }}
                        />
                      )}
                      <View
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: done
                            ? "#2563EB"
                            : cur
                            ? isDark ? "#1E293B" : "#FFFFFF"
                            : isDark ? "#334155" : "#F1F5F9",
                          borderWidth:  cur ? 2 : 0,
                          borderColor:  cur ? "#2563EB" : "transparent",
                        }}
                      >
                        {done ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : (
                          <Text
                            style={{
                              fontSize: 13, fontWeight: "700",
                              color: cur
                                ? "#2563EB"
                                : isDark ? "#475569" : "#94A3B8",
                            }}
                          >
                            {lv.level}
                          </Text>
                        )}
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Labels */}
              <View className="flex-row mt-3">
                {levelData.all_levels.map((lv) => {
                  const done = lv.level < currentLv;
                  const cur  = lv.level === currentLv;
                  return (
                    <View key={lv.level} className="flex-1 items-center">
                      <Text style={{ fontSize: 16 }}>{lv.emoji}</Text>
                      <Text
                        className={`text-xs text-center mt-0.5 ${
                          cur  ? "text-blue-600 font-semibold" :
                          done ? textSec :
                          textMuted
                        }`}
                        numberOfLines={2}
                      >
                        {lv.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Badge Grid ── */}
            <View className="mt-4 px-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`${textPri} text-base font-bold`}>획득 뱃지</Text>
                <Text className={`${textMuted} text-sm`}>
                  {unlockedCount}/{badges.length}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {badges.map((badge) => (
                  <View
                    key={badge.id}
                    style={{ width: "30.5%", opacity: badge.unlocked ? 1 : 0.4 }}
                    className={`${cardBg} rounded-2xl p-3 border items-center ${
                      badge.unlocked ? "border-primary-100" : divider
                    }`}
                  >
                    <Text style={{ fontSize: 28 }}>{badge.icon}</Text>
                    <Text className={`${textPri} text-xs font-bold mt-1.5 text-center`}>
                      {badge.name}
                    </Text>
                    <Text className={`${textMuted} text-xs mt-0.5 text-center leading-4`}>
                      {badge.desc}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Participation History ── */}
            <View className="mt-6 px-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`${textPri} text-base font-bold`}>참여 기록</Text>
                <Text className={`${textMuted} text-xs`}>{filteredHistory.length}건</Text>
              </View>

              {/* Filter chips: 전체 / 토론 / 댓글 */}
              <View className="flex-row mb-3 gap-2">
                {([
                  { key: "all"     as const, label: "전체" },
                  { key: "thread"  as const, label: "토론" },
                  { key: "comment" as const, label: "댓글" },
                ]).map((opt) => {
                  const active = historyFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setHistoryFilter(opt.key)}
                      className={`px-4 py-1.5 rounded-full border ${
                        active
                          ? "bg-blue-600 border-blue-600"
                          : `${cardBg} ${divider}`
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? "text-white" : textSec
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className={`${cardBg} rounded-2xl border ${divider} overflow-hidden`}>
                {filteredHistory.length === 0 ? (
                  <View className="py-10 items-center">
                    <Ionicons name="document-text-outline" size={28} color={iconClr} />
                    <Text className={`${textMuted} text-sm mt-2`}>
                      {historyFilter === "thread"
                        ? "작성한 토론이 없습니다"
                        : historyFilter === "comment"
                        ? "작성한 댓글이 없습니다"
                        : "참여 기록이 없습니다"}
                    </Text>
                  </View>
                ) : (
                  filteredHistory.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.type}-${item.id}`}
                      onPress={() => router.push(`/thread/${item.thread_id}` as any)}
                      activeOpacity={0.6}
                      className={`px-4 py-4 ${
                        idx < filteredHistory.length - 1 ? `border-b ${divider}` : ""
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center">
                          <View
                            className={`rounded-full px-2 py-0.5 mr-2 ${
                              item.type === "thread" ? "bg-blue-50" : "bg-violet-50"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                item.type === "thread" ? "text-blue-600" : "text-violet-600"
                              }`}
                            >
                              {item.type === "thread" ? "토론" : "댓글"}
                            </Text>
                          </View>
                          {item.category ? (
                            <View
                              className={`rounded-full px-2 py-0.5 ${
                                isDark ? "bg-slate-700" : "bg-slate-100"
                              }`}
                            >
                              <Text className={`text-xs ${textSec}`}>{item.category}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="heart" size={12} color="#2563EB" />
                          <Text className="text-blue-600 text-xs font-semibold ml-1">
                            {item.upvotes}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={iconClr} style={{ marginLeft: 4 }} />
                        </View>
                      </View>

                      <Text className={`${textPri} text-sm font-medium leading-5`} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text className={`${textMuted} text-xs mt-1`}>
                        {item.date}{item.region ? ` · ${item.region}` : ""}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* ── Settings ── */}
            <View className="mt-6 mx-4 mb-8">
              <Text className={`${textPri} text-base font-bold mb-3`}>설정</Text>

              <View className={`${cardBg} rounded-2xl border ${divider} overflow-hidden`}>
                {/* Dark mode toggle row */}
                <View className={`flex-row items-center px-4 py-3.5 border-b ${divider}`}>
                  <View
                    className={`w-8 h-8 rounded-xl ${innerBg} items-center justify-center mr-3`}
                  >
                    <Ionicons
                      name={isDark ? "moon" : "sunny-outline"}
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                  <Text className={`flex-1 text-sm font-medium ${textPri}`}>다크 모드</Text>
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
                    thumbColor={isDark ? "#FFFFFF" : "#F8FAFC"}
                  />
                </View>

                {/* Other settings */}
                {(
                  [
                    { icon: "notifications-outline" as const,    label: "알림 설정"      },
                    { icon: "shield-checkmark-outline" as const, label: "개인정보 보호"  },
                    { icon: "help-circle-outline" as const,      label: "도움말 및 FAQ"  },
                    { icon: "flag-outline" as const,             label: "신고 및 피드백" },
                  ] as const
                ).map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    className={`flex-row items-center px-4 py-3.5 border-b ${divider}`}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-8 h-8 rounded-xl ${innerBg} items-center justify-center mr-3`}
                    >
                      <Ionicons name={item.icon} size={18} color={iconClr} />
                    </View>
                    <Text className={`flex-1 text-sm font-medium ${textPri}`}>
                      {item.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={isDark ? "#475569" : "#CBD5E1"}
                    />
                  </TouchableOpacity>
                ))}

                {/* Logout */}
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3.5"
                  activeOpacity={0.7}
                  onPress={handleLogout}
                >
                  <View className="w-8 h-8 rounded-xl bg-red-50 items-center justify-center mr-3">
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  </View>
                  <Text className="flex-1 text-sm font-medium text-red-500">로그아웃</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={showEdit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEdit(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowEdit(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className={`${cardBg} rounded-t-3xl px-5 pt-5 pb-8`}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className={`${textPri} font-bold text-lg`}>프로필 편집</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={22} color={iconClr} />
              </TouchableOpacity>
            </View>

            {editError && (
              <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-xs">{editError}</Text>
              </View>
            )}

            {/* Read-only identity row */}
            {profile && (
              <View className={`${innerBg} rounded-xl px-4 py-3 mb-4`}>
                <Text className={`${textMuted} text-xs mb-0.5`}>표시 이름 (수정 불가)</Text>
                <View className="flex-row items-center">
                  <Text className={`${textPri} text-sm font-semibold mr-1`}>{profile.display_name}</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                </View>
              </View>
            )}

            {/* University */}
            <View className="mb-4">
              <Text className={`${textSec} text-sm font-medium mb-1.5`}>학교</Text>
              <TextInput
                className={`${innerBg} border ${divider} rounded-xl px-4 py-3 text-sm ${textPri}`}
                placeholder="예: 서울대학교"
                placeholderTextColor={iconClr}
                value={editUni}
                onChangeText={setEditUni}
              />
            </View>

            {/* Major */}
            <View className="mb-4">
              <Text className={`${textSec} text-sm font-medium mb-1.5`}>전공</Text>
              <TextInput
                className={`${innerBg} border ${divider} rounded-xl px-4 py-3 text-sm ${textPri}`}
                placeholder="예: 정치외교학과"
                placeholderTextColor={iconClr}
                value={editMajor}
                onChangeText={setEditMajor}
              />
            </View>

            {/* Age group */}
            <View className="mb-6">
              <Text className={`${textSec} text-sm font-medium mb-2`}>연령대</Text>
              <View className="flex-row gap-2">
                {AGE_GROUPS.map((ag) => {
                  const sel = editAge === ag;
                  return (
                    <TouchableOpacity
                      key={ag}
                      onPress={() => setEditAge(ag)}
                      className={`flex-1 py-2.5 rounded-xl items-center border ${
                        sel ? "bg-blue-600 border-blue-600" : `${cardBg} ${divider}`
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-sm font-semibold ${sel ? "text-white" : textSec}`}>
                        {ag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={savingEdit}
              className={`rounded-2xl py-4 items-center ${
                savingEdit ? "bg-slate-300" : "bg-blue-600"
              }`}
              activeOpacity={0.85}
            >
              {savingEdit ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">저장하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

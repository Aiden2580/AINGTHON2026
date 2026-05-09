import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/constants/api";

type ActivityType = "thread" | "comment";

interface HistoryItem {
  id: number;
  thread_id: number;
  type: ActivityType;
  title: string;
  category: string;
  region: string;
  upvotes: number;
  date: string;
}

const TITLES: Record<ActivityType, { title: string; emoji: string; empty: string }> = {
  thread:  { title: "내가 쓴 토론", emoji: "💬", empty: "작성한 토론이 없습니다" },
  comment: { title: "내가 쓴 댓글", emoji: "💭", empty: "작성한 댓글이 없습니다" },
};

export default function ActivitiesScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const activityType: ActivityType = type === "comment" ? "comment" : "thread";
  const meta = TITLES[activityType];

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ history: HistoryItem[] }>(
      `/users/me/history?type=${activityType}&limit=100`,
    )
      .then((res) => { if (!cancelled) setItems(res.history); })
      .catch(() => { if (!cancelled) setError("기록을 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activityType]);

  const isThread = activityType === "thread";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="flex-row items-center bg-white border-b border-slate-200 px-3 pt-2 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#334155" />
        </TouchableOpacity>
        <View className="flex-1 ml-1">
          <Text className="text-slate-900 font-bold text-base">
            {meta.emoji} {meta.title}
          </Text>
          {!loading && (
            <Text className="text-slate-400 text-xs mt-0.5">총 {items.length}건</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" size="large" />
          <Text className="text-slate-400 text-sm mt-3">불러오는 중...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
          <Text className="text-slate-500 text-sm mt-3 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-slate-100 rounded-xl px-4 py-2"
          >
            <Text className="text-slate-600 text-sm font-medium">돌아가기</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-4xl mb-3">{meta.emoji}</Text>
          <Text className="text-slate-700 font-bold text-base text-center">
            {meta.empty}
          </Text>
          <Text className="text-slate-400 text-sm text-center mt-2">
            {isThread
              ? "토론 광장에서 첫 번째 토론을 시작해보세요."
              : "다른 사람의 토론에 의견을 남겨보세요."}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/debate" as any)}
            className="mt-5 bg-primary-600 rounded-xl px-5 py-3"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">토론 광장으로 가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
        >
          {items.map((item) => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              onPress={() => router.push(`/thread/${item.thread_id}` as any)}
              activeOpacity={0.6}
              className="bg-white rounded-2xl border border-slate-100 px-4 py-4 mb-2.5"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center">
                  <View
                    className={`rounded-full px-2 py-0.5 mr-2 ${
                      isThread ? "bg-blue-50" : "bg-violet-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isThread ? "text-blue-600" : "text-violet-600"
                      }`}
                    >
                      {isThread ? "토론" : "댓글"}
                    </Text>
                  </View>
                  {item.category ? (
                    <View className="rounded-full bg-slate-100 px-2 py-0.5">
                      <Text className="text-xs text-slate-500">{item.category}</Text>
                    </View>
                  ) : null}
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="heart" size={12} color="#2563EB" />
                  <Text className="text-blue-600 text-xs font-semibold ml-1">
                    {item.upvotes}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginLeft: 4 }} />
                </View>
              </View>

              <Text
                className="text-slate-900 text-sm font-semibold leading-5"
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                {item.date}{item.region ? ` · ${item.region}` : ""}
              </Text>
            </TouchableOpacity>
          ))}
          <View className="h-4" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

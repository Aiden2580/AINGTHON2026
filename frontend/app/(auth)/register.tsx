import { useState } from "react";
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
import { router } from "expo-router";

import { ApiError, apiFetch } from "@/constants/api";
import { useAuth } from "@/contexts/AuthContext";

interface LoginResponse {
  access_token: string;
  user_id: number;
  display_name: string;
  university: string;
}

const AGE_GROUPS = ["20대", "30대", "40대 이상"];

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [university, setUniversity] = useState("");
  const [major,      setMajor]      = useState("");
  const [ageGroup,   setAgeGroup]   = useState("20대");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !university.trim() || !major.trim() || !password) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<LoginResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          university: university.trim(),
          major: major.trim(),
          age_group: ageGroup,
          password,
        }),
      });
      await login(res.access_token, res.user_id);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("이미 사용 중인 이메일입니다.");
      } else {
        setError("회원가입에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View className="items-center mb-8 mt-4">
            <Text className="text-3xl font-bold text-blue-600 mb-1">Agora</Text>
            <Text className="text-slate-500 text-sm">국내 유일 청년 정책 토론 플랫폼</Text>
          </View>

          {/* Form card */}
          <View className="bg-white rounded-2xl p-6 border border-slate-100">
            <Text className="text-slate-900 text-xl font-bold mb-6">회원가입</Text>

            {error ? (
              <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Name */}
            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">이름 (실명)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="홍길동"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">학교 이메일</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="example@university.ac.kr"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* University */}
            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">학교</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="서울대학교"
                placeholderTextColor="#94A3B8"
                value={university}
                onChangeText={setUniversity}
              />
            </View>

            {/* Major */}
            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">전공</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="컴퓨터공학과"
                placeholderTextColor="#94A3B8"
                value={major}
                onChangeText={setMajor}
              />
            </View>

            {/* Age group */}
            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-2">연령대</Text>
              <View className="flex-row gap-2">
                {AGE_GROUPS.map((ag) => (
                  <TouchableOpacity
                    key={ag}
                    onPress={() => setAgeGroup(ag)}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      ageGroup === ag
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        ageGroup === ag ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {ag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">비밀번호 (6자 이상)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="비밀번호 입력"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Privacy notice */}
            <View className="bg-blue-50 rounded-xl px-4 py-3 mb-6">
              <Text className="text-blue-700 text-xs leading-5">
                실명 정보는 반익명 표시(예: 김G**)에만 사용되며 다른 사용자에게 공개되지 않습니다.
              </Text>
            </View>

            <TouchableOpacity
              className="bg-blue-600 rounded-xl py-4 items-center"
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">가입하기</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View className="flex-row justify-center mt-6 mb-8">
            <Text className="text-slate-500 text-sm">이미 계정이 있으신가요? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
              <Text className="text-blue-600 text-sm font-semibold">로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await login(res.access_token, res.user_id);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.");
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
        <View className="flex-1 justify-center px-6">
          {/* Branding */}
          <View className="items-center mb-10">
            <Text className="text-4xl font-bold text-blue-600 mb-1">Agora</Text>
            <Text className="text-slate-500 text-sm">국내 유일 청년 정책 토론 플랫폼</Text>
          </View>

          {/* Form card */}
          <View className="bg-white rounded-2xl p-6 border border-slate-100">
            <Text className="text-slate-900 text-xl font-bold mb-6">로그인</Text>

            {error ? (
              <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">이메일</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="university@email.ac.kr"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-700 text-sm font-medium mb-1.5">비밀번호</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                placeholder="비밀번호 입력"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-blue-600 rounded-xl py-4 items-center"
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">로그인</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-slate-500 text-sm">계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)}>
              <Text className="text-blue-600 text-sm font-semibold">회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* Demo hint */}
          <View className="mt-4 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
            <Text className="text-amber-700 text-xs text-center font-medium">
              데모 계정: kim@yonsei.ac.kr / demo1234
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

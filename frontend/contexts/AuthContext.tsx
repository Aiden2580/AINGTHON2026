import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const KEY_TOKEN   = "@aingthon_token";
const KEY_USER_ID = "@aingthon_user_id";

interface AuthContextValue {
  token:    string | null;
  userId:   number | null;
  isLoaded: boolean;
  login:    (token: string, userId: number) => Promise<void>;
  logout:   () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null, userId: null, isLoaded: false,
  login: async () => {}, logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,    setToken]    = useState<string | null>(null);
  const [userId,   setUserId]   = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_TOKEN),
      AsyncStorage.getItem(KEY_USER_ID),
    ])
      .then(([t, uid]) => {
        if (t)   setToken(t);
        if (uid) setUserId(Number(uid));
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const login = useCallback(async (t: string, uid: number) => {
    await AsyncStorage.multiSet([[KEY_TOKEN, t], [KEY_USER_ID, String(uid)]]);
    setToken(t);
    setUserId(uid);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([KEY_TOKEN, KEY_USER_ID]);
    setToken(null);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, isLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

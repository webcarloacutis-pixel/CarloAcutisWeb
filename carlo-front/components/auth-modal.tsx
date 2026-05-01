"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { useLanguage } from "@/contexts/language-context"
import { X, User, Mail, Lock, Eye, EyeOff, Cross } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useUser()
  const { language } = useLanguage()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const translations: Record<
    string,
    {
      login: string
      register: string
      name: string
      email: string
      password: string
      loginBtn: string
      registerBtn: string
      noAccount: string
      hasAccount: string
      welcome: string
      joinUs: string
      errorLogin: string
      errorRegister: string
    }
  > = {
    es: {
      login: "Iniciar Sesión",
      register: "Registrarse",
      name: "Nombre",
      email: "Correo electrónico",
      password: "Contraseña",
      loginBtn: "Entrar",
      registerBtn: "Crear cuenta",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      welcome: "Bienvenido de vuelta",
      joinUs: "Únete a nuestra comunidad",
      errorLogin: "Credenciales incorrectas",
      errorRegister: "El correo ya está registrado",
    },
    en: {
      login: "Sign In",
      register: "Sign Up",
      name: "Name",
      email: "Email",
      password: "Password",
      loginBtn: "Sign In",
      registerBtn: "Create Account",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      welcome: "Welcome back",
      joinUs: "Join our community",
      errorLogin: "Invalid credentials",
      errorRegister: "Email already registered",
    },
    fr: {
      login: "Connexion",
      register: "S'inscrire",
      name: "Nom",
      email: "Email",
      password: "Mot de passe",
      loginBtn: "Se connecter",
      registerBtn: "Créer un compte",
      noAccount: "Pas de compte?",
      hasAccount: "Déjà un compte?",
      welcome: "Bon retour",
      joinUs: "Rejoignez notre communauté",
      errorLogin: "Identifiants incorrects",
      errorRegister: "Email déjà enregistré",
    },
    pt: {
      login: "Entrar",
      register: "Registrar",
      name: "Nome",
      email: "Email",
      password: "Senha",
      loginBtn: "Entrar",
      registerBtn: "Criar conta",
      noAccount: "Não tem conta?",
      hasAccount: "Já tem conta?",
      welcome: "Bem-vindo de volta",
      joinUs: "Junte-se à nossa comunidade",
      errorLogin: "Credenciais inválidas",
      errorRegister: "Email já registrado",
    },
    it: {
      login: "Accedi",
      register: "Registrati",
      name: "Nome",
      email: "Email",
      password: "Password",
      loginBtn: "Accedi",
      registerBtn: "Crea account",
      noAccount: "Non hai un account?",
      hasAccount: "Hai già un account?",
      welcome: "Bentornato",
      joinUs: "Unisciti alla nostra comunità",
      errorLogin: "Credenziali non valide",
      errorRegister: "Email già registrata",
    },
    de: {
      login: "Anmelden",
      register: "Registrieren",
      name: "Name",
      email: "E-Mail",
      password: "Passwort",
      loginBtn: "Anmelden",
      registerBtn: "Konto erstellen",
      noAccount: "Kein Konto?",
      hasAccount: "Bereits ein Konto?",
      welcome: "Willkommen zurück",
      joinUs: "Tritt unserer Gemeinschaft bei",
      errorLogin: "Ungültige Anmeldedaten",
      errorRegister: "E-Mail bereits registriert",
    },
    zh: {
      login: "登录",
      register: "注册",
      name: "姓名",
      email: "电子邮件",
      password: "密码",
      loginBtn: "登录",
      registerBtn: "创建账户",
      noAccount: "没有账户？",
      hasAccount: "已有账户？",
      welcome: "欢迎回来",
      joinUs: "加入我们的社区",
      errorLogin: "凭据无效",
      errorRegister: "邮箱已注册",
    },
    ja: {
      login: "ログイン",
      register: "登録",
      name: "名前",
      email: "メール",
      password: "パスワード",
      loginBtn: "ログイン",
      registerBtn: "アカウント作成",
      noAccount: "アカウントがない？",
      hasAccount: "アカウントをお持ち？",
      welcome: "おかえりなさい",
      joinUs: "コミュニティに参加",
      errorLogin: "認証情報が無効",
      errorRegister: "メールは既に登録済み",
    },
    ko: {
      login: "로그인",
      register: "회원가입",
      name: "이름",
      email: "이메일",
      password: "비밀번호",
      loginBtn: "로그인",
      registerBtn: "계정 만들기",
      noAccount: "계정이 없으신가요?",
      hasAccount: "이미 계정이 있으신가요?",
      welcome: "다시 오신 것을 환영합니다",
      joinUs: "커뮤니티에 가입하세요",
      errorLogin: "잘못된 자격 증명",
      errorRegister: "이미 등록된 이메일",
    },
    ar: {
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      name: "الاسم",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      loginBtn: "دخول",
      registerBtn: "إنشاء حساب",
      noAccount: "ليس لديك حساب؟",
      hasAccount: "لديك حساب بالفعل؟",
      welcome: "مرحباً بعودتك",
      joinUs: "انضم إلى مجتمعنا",
      errorLogin: "بيانات غير صحيحة",
      errorRegister: "البريد مسجل بالفعل",
    },
    hi: {
      login: "लॉग इन",
      register: "पंजीकरण",
      name: "नाम",
      email: "ईमेल",
      password: "पासवर्ड",
      loginBtn: "प्रवेश करें",
      registerBtn: "खाता बनाएं",
      noAccount: "खाता नहीं है?",
      hasAccount: "पहले से खाता है?",
      welcome: "वापसी पर स्वागत है",
      joinUs: "हमारे समुदाय में शामिल हों",
      errorLogin: "गलत क्रेडेंशियल",
      errorRegister: "ईमेल पहले से पंजीकृत",
    },
    ru: {
      login: "Войти",
      register: "Регистрация",
      name: "Имя",
      email: "Эл. почта",
      password: "Пароль",
      loginBtn: "Войти",
      registerBtn: "Создать аккаунт",
      noAccount: "Нет аккаунта?",
      hasAccount: "Уже есть аккаунт?",
      welcome: "С возвращением",
      joinUs: "Присоединяйтесь к нам",
      errorLogin: "Неверные данные",
      errorRegister: "Email уже зарегистрирован",
    },
    tr: {
      login: "Giriş Yap",
      register: "Kayıt Ol",
      name: "İsim",
      email: "E-posta",
      password: "Şifre",
      loginBtn: "Giriş",
      registerBtn: "Hesap Oluştur",
      noAccount: "Hesabınız yok mu?",
      hasAccount: "Zaten hesabınız var mı?",
      welcome: "Tekrar hoş geldiniz",
      joinUs: "Topluluğumuza katılın",
      errorLogin: "Geçersiz kimlik bilgileri",
      errorRegister: "E-posta zaten kayıtlı",
    },
    vi: {
      login: "Đăng nhập",
      register: "Đăng ký",
      name: "Tên",
      email: "Email",
      password: "Mật khẩu",
      loginBtn: "Đăng nhập",
      registerBtn: "Tạo tài khoản",
      noAccount: "Chưa có tài khoản?",
      hasAccount: "Đã có tài khoản?",
      welcome: "Chào mừng trở lại",
      joinUs: "Tham gia cộng đồng",
      errorLogin: "Thông tin không hợp lệ",
      errorRegister: "Email đã được đăng ký",
    },
    pl: {
      login: "Zaloguj się",
      register: "Zarejestruj się",
      name: "Imię",
      email: "Email",
      password: "Hasło",
      loginBtn: "Zaloguj",
      registerBtn: "Utwórz konto",
      noAccount: "Nie masz konta?",
      hasAccount: "Masz już konto?",
      welcome: "Witaj ponownie",
      joinUs: "Dołącz do naszej społeczności",
      errorLogin: "Nieprawidłowe dane",
      errorRegister: "Email już zarejestrowany",
    },
  }

  const t = translations[language] || translations.es

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        const success = await login(formData.email, formData.password)
        if (success) {
          onClose()
        } else {
          setError(t.errorLogin)
        }
      } else {
        const success = await register(formData.name, formData.email, formData.password)
        if (success) {
          onClose()
        } else {
          setError(t.errorRegister)
        }
      }
    } catch {
      setError(isLogin ? t.errorLogin : t.errorRegister)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - ancho responsive */}
      <div className="relative w-full max-w-[340px] sm:max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header decorativo - altura responsive */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-primary via-primary/90 to-amber-600 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 w-14 sm:w-20 h-14 sm:h-20 border border-white/30 rounded-full" />
            <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 w-20 sm:w-32 h-20 sm:h-32 border border-white/20 rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Cross className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 opacity-90" />
              <h2 className="text-base sm:text-xl font-serif font-bold">{isLogin ? t.welcome : t.joinUs}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        {/* Form - padding responsive */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Tabs */}
          <div className="flex rounded-lg sm:rounded-xl bg-muted p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true)
                setError("")
              }}
              className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-all ${
                isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false)
                setError("")
              }}
              className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-all ${
                !isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.register}
            </button>
          </div>

          {error && (
            <div className="p-2.5 sm:p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs sm:text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {/* Name field (only for register) */}
          {!isLogin && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                {t.name}
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-8 sm:pl-10 h-10 sm:h-12 rounded-lg sm:rounded-xl text-sm"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm font-medium">
              {t.email}
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-8 sm:pl-10 h-10 sm:h-12 rounded-lg sm:rounded-xl text-sm"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="password" className="text-xs sm:text-sm font-medium">
              {t.password}
            </Label>
            <div className="relative">
              <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-10 sm:h-12 rounded-lg sm:rounded-xl text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-white font-medium text-sm"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>...</span>
              </div>
            ) : isLogin ? (
              t.loginBtn
            ) : (
              t.registerBtn
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/pte/header'
import { Footer } from '@/components/pte/footer'
import { Landing } from '@/components/pte/landing'
import { StudentLogin } from '@/components/pte/student-login'
import { TeacherLogin } from '@/components/pte/teacher-login'
import { StudentDashboard } from '@/components/pte/student-dashboard'
import { TeacherDashboard } from '@/components/pte/teacher-dashboard'
import { AdminDashboard } from '@/components/pte/admin-dashboard'
import { apiGet, apiPost } from '@/lib/api-client'
import type { StudentDashboard as StudentDashboardData } from '@/lib/types'
import { toast } from 'sonner'

type View =
  | 'loading'
  | 'landing'
  | 'student-login'
  | 'teacher-login'
  | 'student-home'
  | 'teacher-home'
  | 'admin-home'

interface StudentInfo {
  id: string
  studentCode: string
  name: string
  email: string | null
  phone: string | null
  courseCode: string
  courseId: string | null
}

interface TeacherInfo {
  id: string
  username: string
  name: string
  role: string
}

interface MeResponse {
  role: 'student' | 'teacher' | 'admin' | null
  student?: StudentInfo
  teacher?: TeacherInfo
}

export default function Home() {
  const [view, setView] = useState<View>('loading')
  const [me, setMe] = useState<MeResponse | null>(null)
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null)
  const loadStartedRef = useRef(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiGet<MeResponse>('/api/me')
      setMe(res)
      if (res.role === 'student') setView('student-home')
      else if (res.role === 'admin') setView('admin-home')
      else if (res.role === 'teacher') setView('teacher-home')
      else setView('landing')
    } catch {
      setView('landing')
    }
  }, [])

  // Check auth on mount
  useEffect(() => {
    let cancelled = false
    apiGet<MeResponse>('/api/me')
      .then((res) => {
        if (cancelled) return
        setMe(res)
        if (res.role === 'student') setView('student-home')
        else if (res.role === 'admin') setView('admin-home')
        else if (res.role === 'teacher') setView('teacher-home')
        else setView('landing')
      })
      .catch(() => {
        if (!cancelled) setView('landing')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load student dashboard data when entering student home
  useEffect(() => {
    if (view !== 'student-home' || loadStartedRef.current) return
    loadStartedRef.current = true
    apiGet<StudentDashboardData>('/api/student/dashboard')
      .then(setStudentData)
      .catch(() => {
        toast.error('Gagal memuat dashboard')
        loadStartedRef.current = false
      })
  }, [view])

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout')
      setMe(null)
      setStudentData(null)
      loadStartedRef.current = false
      setView('landing')
      toast.success('Berhasil keluar')
    } catch {
      toast.error('Gagal keluar')
    }
  }

  // Student login success
  function handleStudentLoginSuccess(student?: StudentInfo) {
    if (student) {
      setMe({ role: 'student', student })
    }
    setView('student-home')
    loadStartedRef.current = false
  }

  // Teacher/Admin login success
  function handleTeacherLoginSuccess(teacher?: TeacherInfo) {
    const role = (teacher?.role || 'teacher') as 'admin' | 'teacher'
    if (teacher) {
      setMe({ role, teacher })
    }
    if (role === 'admin') {
      setView('admin-home')
    } else {
      setView('teacher-home')
    }
  }

  const headerUser = me?.student
    ? { name: me.student.name, code: me.student.studentCode }
    : me?.teacher
    ? { name: me.teacher.name, code: me.teacher.username }
    : null
  const headerRole = me?.role ?? null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header role={headerRole} user={headerUser} onLogout={handleLogout} />
      <main className="flex-1">
        {view === 'loading' && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {view === 'landing' && (
          <Landing
            onSelectStudent={() => setView('student-login')}
            onSelectTeacher={() => setView('teacher-login')}
            onSelectAdmin={() => setView('teacher-login')}
          />
        )}
        {view === 'student-login' && (
          <StudentLogin
            onBack={() => setView('landing')}
            onSuccess={handleStudentLoginSuccess}
          />
        )}
        {view === 'teacher-login' && (
          <TeacherLogin
            onBack={() => setView('landing')}
            onSuccess={handleTeacherLoginSuccess}
          />
        )}
        {view === 'student-home' &&
          (studentData ? (
            <StudentDashboard initialData={studentData} />
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ))}
        {view === 'teacher-home' && <TeacherDashboard />}
        {view === 'admin-home' && <AdminDashboard />}
      </main>
      <Footer />
    </div>
  )
}
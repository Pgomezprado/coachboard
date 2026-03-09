// Re-exported from page wrapper with Suspense
'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Dumbbell, User, Mail } from 'lucide-react'

import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const inviteEmail = searchParams.get('email')
  const isInvited = Boolean(inviteToken)

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as never,
    defaultValues: { role: isInvited ? 'athlete' : 'coach_admin' },
  })

  useEffect(() => {
    if (isInvited) {
      setValue('role', 'athlete')
      if (inviteEmail) setValue('email', decodeURIComponent(inviteEmail))
    }
  }, [isInvited, inviteEmail, setValue])

  const selectedRole = watch('role')

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: data.role,
          invite_token: inviteToken ?? undefined,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback${inviteToken ? `?invite=${inviteToken}` : ''}`,
      },
    })

    if (error) {
      setServerError(
        error.message === 'User already registered'
          ? 'Ya existe una cuenta con este email. Inicia sesión.'
          : error.message
      )
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <Card className="bg-slate-800 border-slate-700 shadow-2xl">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">✉️</span>
          </div>
          <h2 className="text-xl font-semibold text-white">¡Revisa tu email!</h2>
          <p className="text-slate-400 text-sm">
            Te enviamos un link de confirmación. Activa tu cuenta para empezar a usar CoachBoard.
          </p>
          <Link href="/login">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Volver al login
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-white">Crear cuenta</CardTitle>
        <CardDescription className="text-slate-400">
          {isInvited ? 'Acepta tu invitación y comienza a entrenar' : 'Únete a CoachBoard y potencia tu entrenamiento'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invitation banner */}
        {isInvited && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <Mail className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">
              Tu entrenador te invitó. Completa tu registro para unirte.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-md bg-red-900/50 border border-red-700 text-red-300 text-sm">
              {serverError}
            </div>
          )}

          {/* Selector de rol — oculto si es invitado */}
          {!isInvited && <div className="space-y-2">
            <Label className="text-slate-300">Soy...</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('role', 'coach_admin')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedRole === 'coach_admin'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                }`}
              >
                <Dumbbell
                  className={`mb-2 h-5 w-5 ${selectedRole === 'coach_admin' ? 'text-emerald-400' : 'text-slate-400'}`}
                />
                <div className={`font-medium text-sm ${selectedRole === 'coach_admin' ? 'text-emerald-300' : 'text-slate-300'}`}>
                  Entrenador
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Gestiono atletas y planes
                </div>
              </button>
              <button
                type="button"
                onClick={() => setValue('role', 'athlete')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedRole === 'athlete'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                }`}
              >
                <User
                  className={`mb-2 h-5 w-5 ${selectedRole === 'athlete' ? 'text-blue-400' : 'text-slate-400'}`}
                />
                <div className={`font-medium text-sm ${selectedRole === 'athlete' ? 'text-blue-300' : 'text-slate-300'}`}>
                  Atleta
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Sigo mis entrenamientos
                </div>
              </button>
            </div>
            {errors.role && (
              <p className="text-red-400 text-sm">{errors.role.message}</p>
            )}
          </div>}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Nombre completo</Label>
            <Input
              id="name"
              placeholder="Juan García"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-red-400 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-red-400 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...</>
            ) : (
              'Crear cuenta gratis'
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Al registrarte aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </form>

        <p className="text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Configuración de Supabase con la clave de servicio para acceder a funciones administrativas
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Actualizar la configuración de Auth para extender el tiempo de expiración
    // Nota: Esto requiere permisos de servicio y solo funciona si Supabase lo permite
    // En algunos casos, esta configuración debe hacerse desde la consola de Supabase
    
    // Esta es una función simulada ya que la API de Supabase no expone directamente
    // una forma de cambiar esta configuración mediante programación
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'La configuración de tiempo de expiración debe ser actualizada desde la consola de Supabase.',
        instructions: 'Ve a Authentication > Settings > Email y configura "Email Link Expiration" a 1800 segundos (30 minutos).'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
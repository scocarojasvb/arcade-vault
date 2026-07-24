import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { name, email, msg } = await request.json();

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Completa todos los campos." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { ok: false, error: "El correo electrónico no tiene un formato válido." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "santiago.coca@vibeconsulting.com.co",
    subject: "Nuevo mensaje de contacto — Arcade Vault",
    text: `Nombre: ${name.trim()}\nCorreo: ${email.trim()}\n\nMensaje:\n${msg.trim()}`,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje, intenta de nuevo." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

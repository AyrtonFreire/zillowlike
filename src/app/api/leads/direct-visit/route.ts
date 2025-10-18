import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { VisitSchedulingService } from "@/lib/visit-scheduling-service";
import { z } from "zod";

/**
 * API para corretor agendar visita direta (não vai ao mural)
 * Útil quando o corretor já tem um comprador e quer agendar direto
 */

const DirectVisitSchema = z.object({
  propertyId: z.string().min(1),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  visitDate: z.string(), // ISO string
  visitTime: z.string(), // "14:00"
  clientNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Apenas corretores podem agendar visitas diretas
    if (!session?.user || (session.user as any).role !== "REALTOR") {
      return NextResponse.json(
        { error: "Apenas corretores podem agendar visitas diretas" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = DirectVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { propertyId, clientName, clientEmail, clientPhone, visitDate, visitTime, clientNotes } = parsed.data;

    // Cria lead direto (com realtorId)
    const lead = await VisitSchedulingService.createVisitRequest({
      propertyId,
      clientName,
      clientEmail,
      clientPhone,
      visitDate: new Date(visitDate),
      visitTime,
      clientNotes,
      realtorId: (session.user as any).id, // 🆕 Marca como lead direto
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: "Visita direta agendada! Aguardando aprovação do proprietário.",
      isDirect: true,
    });
  } catch (error: any) {
    console.error("Error creating direct visit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create direct visit" },
      { status: 400 }
    );
  }
}

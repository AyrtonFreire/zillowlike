import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const creciDocument = formData.get("creciDocument") as File;
    const identityDocument = formData.get("identityDocument") as File;

    if (!creciDocument || !identityDocument) {
      return NextResponse.json(
        { error: "Documentos obrigatórios não fornecidos" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "realtor-docs");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const userId = (session.user as any).id;
    const timestamp = Date.now();

    // Save CRECI document
    const creciExt = creciDocument.name.split(".").pop();
    const creciFilename = `creci-${userId}-${timestamp}.${creciExt}`;
    const creciPath = join(uploadsDir, creciFilename);
    const creciBuffer = Buffer.from(await creciDocument.arrayBuffer());
    await writeFile(creciPath, creciBuffer);

    // Save identity document
    const identityExt = identityDocument.name.split(".").pop();
    const identityFilename = `identity-${userId}-${timestamp}.${identityExt}`;
    const identityPath = join(uploadsDir, identityFilename);
    const identityBuffer = Buffer.from(await identityDocument.arrayBuffer());
    await writeFile(identityPath, identityBuffer);

    return NextResponse.json({
      success: true,
      creciDocumentUrl: `/uploads/realtor-docs/${creciFilename}`,
      identityDocumentUrl: `/uploads/realtor-docs/${identityFilename}`,
    });
  } catch (error) {
    console.error("Error uploading documents:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload dos documentos" },
      { status: 500 }
    );
  }
}

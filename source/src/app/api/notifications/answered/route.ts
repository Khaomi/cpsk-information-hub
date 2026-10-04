import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { studentEmail, question, answer, answeredBy } = await req.json();

    await resend.emails.send({
      from: "Course Q&A Platform <no-reply@yourdomain.com>",
      to: [studentEmail],
      subject: `Your question has been answered!`,
      html: `
        <h2>Your question was answered by ${answeredBy}</h2>
        <p><strong>Question:</strong> ${question}</p>
        <p><strong>Answer:</strong></p>
        <blockquote style="border-left: 3px solid #0d9488; padding-left: 10px;">${answer}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/faqs">View full discussion thread</a></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
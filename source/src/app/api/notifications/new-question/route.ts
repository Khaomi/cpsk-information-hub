import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { question, authorName, isAnonymous } = await req.json();

    // Fetch all Admin, Lecturer, and TA email addresses from DB
    const staffEmails = ["lecturer@university.edu", "ta@university.edu"];

    await resend.emails.send({
      from: "Course Q&A Platform <no-reply@yourdomain.com>",
      to: staffEmails,
      subject: `[New Question] ${question.slice(0, 50)}...`,
      html: `
        <h2>A new student question was submitted</h2>
        <p><strong>Student:</strong> ${isAnonymous ? `${authorName} (Posted Anonymously)` : authorName}</p>
        <p><strong>Question:</strong> ${question}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/faqs">Click here to respond on the Q&A platform</a></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
import { GoogleAuthButton } from "@/src/components/google-auth-button";
import { LoginForm } from "@/src/components/login-form";

export default function Page() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Welcome to CPSK</h1>
        <p className="text-stone-600 mb-8">Department Information &amp; Communication Hub</p>
        {/* <button
          type="button"
          onClick={handleSignIn}
          className="w-full rounded-md bg-gradient-to-r from-orange-400 to-teal-500 text-white font-medium py-3 hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button> */}
        <GoogleAuthButton />
        <p className="text-xs text-stone-400 mt-3">
          Please use <span className="font-medium text-stone-600">@ku.th</span> email to login
        </p>
      </div>
    </div>
  );
}

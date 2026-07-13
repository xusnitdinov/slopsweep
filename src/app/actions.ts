"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Force GitHub's account picker so you can switch users. */
export async function changeAccountAction() {
  await signOut({ redirect: false });
  await signIn(
    "github",
    { redirectTo: "/dashboard" },
    { prompt: "select_account" },
  );
}

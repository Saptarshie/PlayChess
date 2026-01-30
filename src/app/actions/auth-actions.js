"use server";

import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signUp(prevState, formData) {
  const username = formData.get("username");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!username || !email || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return { error: "Email already in use" };
      }
      return { error: "Username already taken" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return { success: "Account created successfully! You can now sign in." };
  } catch (err) {
    console.error("Sign up error:", err);
    return {
      errorMessage: "Internal server error. Please try again.",
      error: err,
    };
  }
}

export async function signIn(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    // console.log(user);

    if (!user || !user.password) {
      return { error: "Invalid email or password" };
    }
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { error: "Invalid email or password." };
    }

    // Create JWT
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 hours
      path: "/",
    });

    // Return user data for client-side state update
    return {
      success: "Signed in successfully!",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Something went wrong." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

export async function validateUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  // console.log(token);

  if (!token) {
    console.log("No token found");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { userId, email, username, iat, exp }
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes that require authentication
  const protectedPaths = ["/dashboard", "/staff", "/properties", "/admin"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Redirect unauthenticated users to login
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Get user profile and check disabled status
  let profile: { role: string; disabled: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, disabled")
      .eq("id", user.id)
      .single();
    profile = data;

    // If user is disabled, sign them out and redirect to login
    if (profile?.disabled) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account_disabled");
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && user && profile) {
    const url = request.nextUrl.clone();
    // Redirect based on role
    switch (profile.role) {
      case "admin":
        url.pathname = "/admin";
        break;
      case "staff":
      url.pathname = "/staff";
        break;
      default:
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Role-based access control for protected paths
  if (user && profile && isProtectedPath) {
    const role = profile.role;
    const url = request.nextUrl.clone();

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (role !== "admin") {
        // Non-admins cannot access admin routes
        url.pathname = role === "staff" ? "/staff" : "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // Manager-only routes (dashboard, properties)
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/properties")) {
    if (role === "staff") {
        // Staff cannot access manager dashboard or properties directly
        url.pathname = "/staff";
        return NextResponse.redirect(url);
      }
      // Note: admin CAN access dashboard and properties
    }

    // Staff routes - managers go to dashboard, admin can access
    if (pathname.startsWith("/staff")) {
    if (role === "manager") {
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      // Note: admin CAN access staff routes for oversight
    }
  }

  return supabaseResponse;
}

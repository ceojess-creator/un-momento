import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/creator/dashboard(.*)',
  '/creator/studio(.*)',
  '/account(.*)',
  '/admin(.*)',
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/schools/(.*)',
  '/api/creator/search(.*)',
  '/api/fundraiser/(.*)',
  '/api/event/(.*)',
  '/api/checkout(.*)',
  '/api/upload(.*)',
  '/api/webhooks/(.*)',
  '/api/notify/(.*)',
  '/api/fulfillment/(.*)',
  '/api/remove-bg(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicApiRoute(req)) return;
  if (isProtectedRoute(req)) auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
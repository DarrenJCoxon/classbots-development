// src/app/api/test/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Test API endpoint called');
  return NextResponse.json({ message: 'API is working!' });
}
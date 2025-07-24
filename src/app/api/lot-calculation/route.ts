import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/config/brand';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    if (!lotId) {
      return NextResponse.json(
        { error: 'lotId parameter is required' },
        { status: 400 }
      );
    }

    const apiUrl = getApiUrl();
    const backendUrl = `${apiUrl}/design-on-lot/calculate?lotId=${lotId}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying lot calculation request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lot calculation' },
      { status: 500 }
    );
  }
} 
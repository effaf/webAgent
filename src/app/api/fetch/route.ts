import { NextResponse } from 'next/server'

function isValidYCombinatorUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // Check if it's the companies page or a subpage
    return urlObj.origin === 'https://www.ycombinator.com' && 
           urlObj.pathname.startsWith('/companies')
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    if (!isValidYCombinatorUrl(url)) {
      return NextResponse.json(
        { error: 'Only YCombinator companies page and its subpages are supported' },
        { status: 400 }
      )
    }

    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch data: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    return NextResponse.json({ html })
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
} 
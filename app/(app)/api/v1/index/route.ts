import { NextResponse } from 'next/server';
import { IndexResponseData, sample_db_index } from './db';


export function GET() {

    const data: IndexResponseData[] = sample_db_index;

    return NextResponse.json(data);
}
import asyncio
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def main():
    client = AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    for model in ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"]:
        try:
            print(f"Testing {model}...")
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            print(f"Success with {model}:", response.choices[0].message.content)
            break
        except Exception as e:
            print(f"Failed with {model}:", e)

asyncio.run(main())

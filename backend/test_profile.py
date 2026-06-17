import asyncio
from rag.pipeline import extract_client_profile

async def main():
    history = [{"role": "user", "content": "Sérum luminoso"}]
    profile1 = await extract_client_profile("Antimanchas", history)
    print("1. Profile after 'Antimanchas':", profile1.get('missing_fields'))
    print("1. Extracted concern:", profile1.get('concern'))

    history.append({"role": "user", "content": "Antimanchas"})
    profile2 = await extract_client_profile("Ambos", history)
    print("2. Profile after 'Ambos':", profile2.get('missing_fields'))
    print("2. Extracted usage_moment:", profile2.get('usage_moment'))

    history.append({"role": "user", "content": "Ambos"})
    profile3 = await extract_client_profile("Prevenir nuevas manchas", history)
    print("3. Profile after 'Prevenir nuevas manchas':", profile3.get('missing_fields'))
    print("3. Extracted concern:", profile3.get('concern'))

if __name__ == "__main__":
    asyncio.run(main())

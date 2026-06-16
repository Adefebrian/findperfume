import libsql_client, asyncio
URL="https://findperfume-adefebrian.aws-ap-northeast-1.turso.io"
TOKEN=open("/tmp/turso_db_token.txt").read().strip()
async def main():
    async with libsql_client.create_client(url=URL, auth_token=TOKEN) as c:
        r=await c.execute("""SELECT p.name,p.brand,p.rating_scent FROM perfumes_fts f
            JOIN perfumes p ON p.id=f.rowid WHERE perfumes_fts MATCH ?
            AND p.gender IN ('female','unisex') ORDER BY p.popularity DESC LIMIT 5""",
            ['"citrus" OR "fresh" OR "bergamot"'])
        for row in r.rows: print(row[2],"|",row[0],"-",row[1])
asyncio.run(main())

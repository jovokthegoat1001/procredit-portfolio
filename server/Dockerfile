FROM denoland/deno:alpine-2.9.5

WORKDIR /app

# Cache dependencies in their own layer first, so editing main.ts later
# doesn't force re-downloading every remote import on each build.
COPY main.ts mailer.ts ./
RUN deno cache main.ts

# Railway injects its own PORT at runtime; main.ts reads it via Deno.env.
EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "main.ts"]

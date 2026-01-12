WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN "phone" IS NULL OR btrim("phone") = '' THEN NULL
      WHEN left(btrim("phone"), 1) = '+' THEN '+' || regexp_replace(btrim("phone"), '[^0-9]', '', 'g')
      ELSE
        CASE
          WHEN length(regexp_replace("phone", '\\D', '', 'g')) IN (10, 11)
            THEN '+55' || regexp_replace("phone", '\\D', '', 'g')
          ELSE '+' || regexp_replace("phone", '\\D', '', 'g')
        END
    END AS pn
  FROM "User"
  WHERE "phoneNormalized" IS NULL AND "phone" IS NOT NULL AND btrim("phone") <> ''
), unique_pn AS (
  SELECT pn
  FROM normalized
  WHERE pn IS NOT NULL AND pn <> '+'
  GROUP BY pn
  HAVING count(*) = 1
)
UPDATE "User" u
SET "phoneNormalized" = n.pn
FROM normalized n
JOIN unique_pn up ON up.pn = n.pn
WHERE u.id = n.id;

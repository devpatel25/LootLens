# Database schema

Built from `prisma/schema.prisma`. PostgreSQL on Neon. Every user-owned table filters by `userId` from the session.

```mermaid
erDiagram
  User ||--o{ Account : has
  User ||--o{ Session : has
  User ||--o{ Item : owns
  User ||--o{ Watch : owns
  User ||--o{ Alert : owns
  User ||--o| UserSettings : has
  User |o--o{ Code : "last checked"
  Item ||--o{ Listing : has
  Item ||--o{ Watch : "watched via"
  Item ||--o{ Alert : about
  Store ||--o{ Listing : sells
  Store ||--o{ Code : issues
  Listing ||--o{ PriceHistory : records
  Watch |o--o{ Alert : raises

  User {
    string id PK
    string email UK
    string name
    datetime emailVerified
    string image
    datetime createdAt
    datetime updatedAt
  }
  Item {
    string id PK
    string userId FK
    string name
    string category
    string[] sizes
    string selectedSize
    decimal typicalPrice
    string imageUrl
    string sourceUrl
    datetime lastRefreshedAt
    datetime createdAt
    datetime updatedAt
  }
  Listing {
    string id PK
    string itemId FK
    string storeId FK
    string url
    decimal price
    json stockBySize
    Condition condition
    DataSource source
    datetime updatedAt
  }
  PriceHistory {
    string id PK
    string listingId FK
    decimal price
    datetime recordedAt
  }
  Store {
    string id PK
    string name
    string sellerName
    string domain
    boolean isHttps
    int photoReviewCount
    decimal rating
    boolean fictional
    json cashback
  }
  Code {
    string id PK
    string storeId FK
    string lastCheckedById FK
    string code
    string label
    CodeType type
    decimal value
    decimal minSpend
    boolean firstOrderOnly
    datetime expiresAt
    CodeStatus status
    datetime lastCheckedAt
    datetime createdAt
    datetime updatedAt
  }
  Watch {
    string id PK
    string userId FK
    string itemId FK
    string size
    decimal targetPrice
    int lowStockAt
    decimal baselinePrice
    boolean active
    boolean priceCondMet
    boolean stockCondMet
    datetime createdAt
  }
  Alert {
    string id PK
    string userId FK
    string itemId FK
    string watchId FK
    AlertKind kind
    json detail
    boolean read
    datetime createdAt
  }
  UserSettings {
    string id PK
    string userId FK
    int freshnessHours
    boolean firstOrderEligible
  }
  Account {
    string provider PK
    string providerAccountId PK
    string type
    string userId FK
    string refresh_token
    string access_token
    int expires_at
    string token_type
    string scope
    string id_token
    string session_state
    datetime createdAt
    datetime updatedAt
  }
  Session {
    string sessionToken UK
    string userId FK
    datetime expires
    datetime createdAt
    datetime updatedAt
  }
```

`VerificationToken` (Auth.js) has no relations and is left out of the diagram. `Session` is unused: sessions are JWT, so the table stays empty.

## Ownership

| Model | Owner | Note |
|---|---|---|
| User, Account | Auth.js | Written by the Auth.js adapter. |
| Session | Auth.js | Unused. Sessions are JWT, so no rows are written. |
| Item | the signed-in user | Deleting the user deletes their items. |
| Listing | the item's owner | Reached through Item. Deleted with the item. One row per item, store and condition. |
| PriceHistory | the item's owner | Reached through Listing. Deleted with the listing. |
| Watch | the signed-in user | One per user, item and size. Deleted with the item or user. |
| Alert | the signed-in user | Deleted with the item or user. Deleting its watch keeps the alert and sets `watchId` to null. |
| UserSettings | the signed-in user | One row per user, created at sign-up by the `createUser` event. Reads fall back to defaults if the row is missing, and PATCH upserts it. |
| Store | shared | Any signed-in user can read. Created by seed only. |
| Code | shared | Any signed-in user can read and mark live or dead, which sets `lastCheckedAt` and `lastCheckedById`. Created by seed or ingestion only. |

## Alert dedupe

`Watch.priceCondMet` and `Watch.stockCondMet` remember whether each condition already holds. An alert is created only when a condition flips from false to true, so a price that stays below target does not alert again.

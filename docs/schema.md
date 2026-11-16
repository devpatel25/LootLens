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
  }
  Item {
    string id PK
    string userId FK
    string name
    string category
    string[] sizes
    string selectedSize
    decimal typicalPrice
    datetime lastRefreshedAt
  }
  Listing {
    string id PK
    string itemId FK
    string storeId FK
    decimal price
    json stockBySize
    Condition condition
    DataSource source
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
    CodeType type
    decimal value
    decimal minSpend
    boolean firstOrderOnly
    datetime expiresAt
    CodeStatus status
    datetime lastCheckedAt
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
  }
  Alert {
    string id PK
    string userId FK
    string itemId FK
    string watchId FK
    AlertKind kind
    json detail
    boolean read
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
    string userId FK
  }
  Session {
    string sessionToken UK
    string userId FK
  }
```

`VerificationToken` (Auth.js) has no relations and is left out of the diagram.

## Ownership

| Model | Owner | Note |
|---|---|---|
| User, Account, Session | Auth.js | Written by the Auth.js adapter. |
| Item | the signed-in user | Deleting the user deletes their items. |
| Listing | the item's owner | Reached through Item. Deleted with the item. One row per item, store and condition. |
| PriceHistory | the item's owner | Reached through Listing. Deleted with the listing. |
| Watch | the signed-in user | One per user, item and size. Deleted with the item or user. |
| Alert | the signed-in user | Deleted with the item or user. Deleting its watch keeps the alert and sets `watchId` to null. |
| UserSettings | the signed-in user | One row per user, created on first save. |
| Store | shared | Any signed-in user can read. Created by seed only. |
| Code | shared | Any signed-in user can read and mark live or dead, which sets `lastCheckedAt` and `lastCheckedById`. Created by seed or ingestion only. |

## Alert dedupe

`Watch.priceCondMet` and `Watch.stockCondMet` remember whether each condition already holds. An alert is created only when a condition flips from false to true, so a price that stays below target does not alert again.

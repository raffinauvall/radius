export const demoOperations = {
  "products": [
    {
      "id": "radius-sock",
      "name": "Radius Sock",
      "price": 149000,
      "collection": "Everyday kit",
      "stock": null,
      "description": "",
      "imageUrl": "",
      "active": true
    },
    {
      "id": "radius-tee",
      "name": "Radius Tee",
      "price": 299000,
      "collection": "Core collection",
      "stock": null,
      "description": "",
      "imageUrl": "",
      "active": true
    },
    {
      "id": "radius-cap",
      "name": "Radius Cap",
      "price": 249000,
      "collection": "Everyday kit",
      "stock": null,
      "description": "",
      "imageUrl": "",
      "active": true
    },
    {
      "id": "performance-tee",
      "name": "Performance Tee",
      "price": 399000,
      "collection": "Performance collection",
      "stock": null,
      "description": "",
      "imageUrl": "",
      "active": true
    }
  ],
  "events": [
    {
      "id": "run-the-prep",
      "name": "RADIUS × SALADSTOP! Run the Prep",
      "category": "RUN CLUB",
      "city": "Jakarta",
      "startsAt": "2026-10-18",
      "dateLabel": "18 OCT 2026",
      "distance": "3K community run",
      "venue": "",
      "description": "",
      "imageUrl": "",
      "active": true,
      "priceFrom": 75000,
      "tickets": [
        {
          "name": "Regular",
          "price": 100000,
          "capacity": null,
          "default": true
        },
        {
          "name": "Radius+",
          "price": 75000,
          "capacity": null,
          "default": false
        }
      ],
      "archived": false,
      "createdAt": "2026-10-04T17:46:45.093Z",
      "updatedAt": "2026-10-04T17:47:02.911Z"
    },
    {
      "id": "sunday-mile",
      "name": "Sunday Mile: South Jakarta",
      "category": "COMMUNITY RUN",
      "city": "Jakarta Selatan",
      "startsAt": "2026-11-01",
      "dateLabel": "01 NOV 2026",
      "distance": "5K easy pace",
      "venue": "",
      "description": "",
      "imageUrl": "",
      "active": true,
      "priceFrom": 0,
      "tickets": [
        {
          "name": "Community",
          "price": 0,
          "capacity": null,
          "default": true
        }
      ]
    },
    {
      "id": "night-shift",
      "name": "Night Shift: Pace & Play",
      "category": "SOCIAL RUN",
      "city": "Jakarta",
      "startsAt": "2026-11-14",
      "dateLabel": "14 NOV 2026",
      "distance": "4K after-work run",
      "venue": "",
      "description": "",
      "imageUrl": "",
      "active": true,
      "priceFrom": 125000,
      "tickets": [
        {
          "name": "Regular",
          "price": 125000,
          "capacity": null,
          "default": true
        }
      ]
    }
  ],
  "tickets": [
    {
      "id": "ticket-prep",
      "customerId": "customer-andreas-peterang",
      "eventId": "run-the-prep",
      "code": "RAD-2026-001",
      "event": "RADIUS × SALADSTOP! Run the Prep",
      "status": "VALID",
      "category": "RUN CLUB",
      "partner": "Radius Society",
      "date": "18 Oktober 2026",
      "day": "18",
      "month": "OCT",
      "city": "Jakarta",
      "distance": "3K community run",
      "type": "Regular",
      "price": 100000
    },
    {
      "id": "ticket-mile",
      "customerId": "customer-andreas-peterang",
      "eventId": "sunday-mile",
      "code": "RAD-2026-002",
      "event": "Sunday Mile",
      "status": "ATTENDED",
      "category": "COMMUNITY RUN",
      "partner": "Radius Society",
      "date": "27 September 2026",
      "day": "27",
      "month": "SEP",
      "city": "Jakarta Selatan",
      "distance": "5K easy pace",
      "type": "Community",
      "price": 0
    },
    {
      "id": "ticket-night",
      "customerId": "customer-andreas-peterang",
      "eventId": "night-shift",
      "code": "RAD-2026-003",
      "event": "Night Shift",
      "status": "VALID",
      "category": "SOCIAL RUN",
      "partner": "Radius Society",
      "date": "14 November 2026",
      "day": "14",
      "month": "NOV",
      "city": "Jakarta",
      "distance": "4K after-work run",
      "type": "Regular",
      "price": 125000
    }
  ],
  "orders": [
    {
      "id": "RAD-ORD-004",
      "customerId": "customer-andreas-peterang",
      "date": "1 Oktober 2026",
      "createdAt": "2026-10-01T00:00:00.000Z",
      "items": [
        {
          "productId": "performance-tee",
          "name": "Radius Performance Tee",
          "quantity": 1,
          "unitPrice": 399000
        }
      ],
      "total": 399000,
      "status": "SHIPPED",
      "address": "",
      "tracking": "",
      "notes": ""
    },
    {
      "id": "RAD-ORD-003",
      "customerId": "customer-andreas-peterang",
      "date": "20 September 2026",
      "createdAt": "2026-09-20T00:00:00.000Z",
      "items": [
        {
          "productId": "radius-sock",
          "name": "Radius Sock",
          "quantity": 1,
          "unitPrice": 149000
        }
      ],
      "total": 149000,
      "status": "DELIVERED",
      "address": "",
      "tracking": "",
      "notes": ""
    },
    {
      "id": "RAD-ORD-002",
      "customerId": "customer-andreas-peterang",
      "date": "10 September 2026",
      "createdAt": "2026-09-10T00:00:00.000Z",
      "items": [
        {
          "productId": "radius-cap",
          "name": "Radius Cap",
          "quantity": 1,
          "unitPrice": 249000
        }
      ],
      "total": 249000,
      "status": "DELIVERED",
      "address": "",
      "tracking": "",
      "notes": ""
    },
    {
      "id": "RAD-ORD-001",
      "customerId": "customer-andreas-peterang",
      "date": "28 Agustus 2026",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "items": [
        {
          "productId": "radius-tee",
          "name": "Radius Tee",
          "quantity": 1,
          "unitPrice": 299000
        }
      ],
      "total": 299000,
      "status": "DELIVERED",
      "address": "",
      "tracking": "",
      "notes": ""
    }
  ]
};

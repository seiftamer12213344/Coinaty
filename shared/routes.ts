import { z } from "zod";
import { insertCoinSchema, coins, users, comments, messages } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const userResponseSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  points: z.number().nullable(),
});

export const api = {
  coins: {
    list: {
      method: "GET" as const,
      path: "/api/coins" as const,
      input: z.object({
        category: z.string().optional(),
        userId: z.string().optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof coins.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/coins/:id" as const,
      responses: {
        200: z.custom<typeof coins.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/coins" as const,
      input: insertCoinSchema,
      responses: {
        201: z.custom<typeof coins.$inferSelect>(),
        400: errorSchemas.validation,
        401: z.object({ message: z.string() })
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/coins/:id" as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    toggleLike: {
      method: "POST" as const,
      path: "/api/coins/:id/like" as const,
      responses: {
        200: z.object({ likesCount: z.number(), likedByMe: z.boolean() }),
        401: z.object({ message: z.string() })
      },
    },
    getLikes: {
      method: "GET" as const,
      path: "/api/coins/:id/likes" as const,
      responses: {
        200: z.array(userResponseSchema),
      },
    }
  },
  comments: {
    list: {
      method: "GET" as const,
      path: "/api/coins/:id/comments" as const,
      responses: {
        200: z.array(z.custom<typeof comments.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/coins/:id/comments" as const,
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof comments.$inferSelect>(),
        400: errorSchemas.validation,
        401: z.object({ message: z.string() })
      },
    },
  },
  users: {
    search: {
      method: "GET" as const,
      path: "/api/users/search" as const,
      responses: {
        200: z.array(userResponseSchema),
      }
    },
    leaderboard: {
      method: "GET" as const,
      path: "/api/users/leaderboard" as const,
      responses: {
        200: z.array(userResponseSchema),
      }
    },
    getProfile: {
      method: "GET" as const,
      path: "/api/users/:id" as const,
      responses: {
        200: userResponseSchema,
        404: errorSchemas.notFound,
      }
    },
    updateProfile: {
      method: "PUT" as const,
      path: "/api/users/profile" as const,
      input: z.object({
        displayName: z.string().optional(),
        profileImageUrl: z.string().optional()
      }),
      responses: {
        200: userResponseSchema,
        401: z.object({ message: z.string() })
      }
    },
  },
  messages: {
    list: {
      method: "GET" as const,
      path: "/api/messages/:userId" as const,
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
        401: z.object({ message: z.string() })
      }
    },
    send: {
      method: "POST" as const,
      path: "/api/messages/:userId" as const,
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
        401: z.object({ message: z.string() })
      }
    },
    getConversations: {
      method: "GET" as const,
      path: "/api/messages" as const,
      responses: {
        200: z.array(userResponseSchema),
        401: z.object({ message: z.string() })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CoinResponse = z.infer<typeof api.coins.get.responses[200]>;
export type UserResponse = z.infer<typeof api.users.getProfile.responses[200]>;
export type CommentResponse = z.infer<typeof api.comments.list.responses[200]>[number];

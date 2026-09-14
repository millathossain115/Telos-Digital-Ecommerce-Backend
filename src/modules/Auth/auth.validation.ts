import { z } from "zod";

const customerRegisterValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Full name is required",
    }),
    email: z
      .string({
        required_error: "Email address is required",
      })
      .email("Invalid email address format"),
    password: z
      .string({
        required_error: "Password is required",
      })
      .min(6, "Password must be at least 6 characters long"),
    phone: z.string().optional(),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email address is required",
      })
      .email("Invalid email address format"),
    password: z.string({
      required_error: "Password is required",
    }),
  }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({
      required_error: "Current password is required",
    }),
    newPassword: z
      .string({
        required_error: "New password is required",
      })
      .min(6, "New password must be at least 6 characters long"),
  }),
});

export const AuthValidation = {
  customerRegisterValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
};

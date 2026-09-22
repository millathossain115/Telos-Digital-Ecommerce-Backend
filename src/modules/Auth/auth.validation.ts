import { z } from "zod";

const customerRegisterValidationSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      fullName: z.string().optional(),
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
      phone: z
        .string({
          required_error: "Phone number is required",
        })
        .trim()
        .min(6, "Phone number must be at least 6 characters long"),
    })
    .refine((data) => data.name?.trim() || data.fullName?.trim(), {
      message: "Full name is required",
      path: ["name"],
    }),
});

const loginValidationSchema = z.object({
  body: z
    .object({
      email: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      mobile: z.string().trim().optional(),
      identifier: z.string().trim().optional(),
      password: z.string({
        required_error: "Password is required",
      }),
    })
    .refine(
      (data) => data.email || data.phone || data.mobile || data.identifier,
      {
        message: "Email or phone number is required",
        path: ["email"],
      },
    ),
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

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required").optional(),
    avatar: z.string().url("Avatar must be a valid URL").optional(),
  }),
});

const googleLoginValidationSchema = z.object({
  body: z.object({
    idToken: z
      .string({
        required_error: "Google ID token is required",
      })
      .min(1, "Google ID token cannot be empty"),
  }),
});

export const AuthValidation = {
  customerRegisterValidationSchema,
  loginValidationSchema,
  googleLoginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
  updateProfileValidationSchema,
};

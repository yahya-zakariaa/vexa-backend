import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      maxLength: [150, "Name must be at most 150 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minLength: [10, "Description must be at least 10 characters"],
      maxLength: [500, "Description must be at most 500 characters"],
      trim: true,
    },
    images: {
      type: [String],
      required: [true, "At least one image is required"],
      validate: [(arr) => arr.length > 0, "At least one image is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be at least 0"],
      set: (v) => (v == null ? v : Math.round(Number(v))),
    },

    onSale: {
      type: Boolean,
      default: false,
    },
    discountType: {
      type: String,
      enum: {
        values: ["percentage", "fixed", "none"],
        message: "Discount type must be 'percentage' or 'fixed'",
      },
      default: "none",
    },
    discount: {
      type: Number,
      min: [0, "Discount must be at least 0"],
      validate: {
        validator: function (v) {
          if (this.discountType === "percentage") {
            return v <= 100;
          }
          if (this.discountType === "fixed") {
            return v <= this.price;
          }
          return true;
        },
        message: "Invalid discount value for the selected discount type",
      },
      default: 0,
    },
    totalPrice: {
      type: Number,
      min: [0, "Total price must be at least 0"],
      set: (v) => (v == null ? v : Math.round(Number(v))),
    },

    stock: {
      type: Number,
      required: [true, "Count in stock is required"],
      min: [0, "Count in stock must be at least 0"],
      default: 1,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, "Sold count must be at least 0"],
    },

    collection: {
      type: String,
      required: [true, "collection is required"],
      minLength: [4, "collection must be at least 4 characters"],
      maxLength: [50, "collection must be at most 50 characters"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    sizes: {
      type: [String],
      required: [true, "Sizes are required"],
      enum: {
        values: ["XS", "S", "M", "L", "XL", "XXL"],
        message: "Size must be one of XS, S, M, L, XL, XXL",
      },
    },
    gender: {
      type: String,
      default: "Unisex",
      enum: {
        values: ["Men", "Women", "Unisex"],
        message: "Gender must be one of Men, Women or Unisex",
      },
    },
  },
  { timestamps: true }
);

productSchema.pre("save", function (next) {
  try {
    // Ensure numeric fields are normalized and calculate total
    if (this.price != null) this.price = Number(this.price);
    if (this.discount != null) this.discount = Number(this.discount);
    this.calculateTotalPrice();
    next();
  } catch (err) {
    next(err);
  }
});
productSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const rawUpdate = this.getUpdate() || {};
    // Support both top-level updates and $set updates
    const update = rawUpdate.$set ? { ...rawUpdate.$set } : { ...rawUpdate };

    const doc = await this.model.findOne(this.getQuery());
    if (!doc) return next();

    const price = update.price !== undefined ? Number(update.price) : doc.price;
    const discount =
      update.discount !== undefined ? Number(update.discount) : doc.discount;
    const discountType =
      update.discountType !== undefined
        ? update.discountType
        : doc.discountType;

    let total = price;
    let onSale = false;

    if (discountType === "percentage") {
      total = Math.max(price * (1 - (discount || 0) / 100), 0);
      onSale = (discount || 0) > 0;
    } else if (discountType === "fixed") {
      total = Math.max(price - (discount || 0), 0);
      onSale = (discount || 0) > 0;
    }

    const roundedTotal = Math.round(total);

    // Write back into the update object preserving $set or top-level
    if (rawUpdate.$set) {
      rawUpdate.$set.totalPrice = roundedTotal;
      rawUpdate.$set.onSale = onSale;
      this.setUpdate(rawUpdate);
    } else {
      rawUpdate.totalPrice = roundedTotal;
      rawUpdate.onSale = onSale;
      this.setUpdate(rawUpdate);
    }

    next();
  } catch (err) {
    next(err);
  }
});

productSchema.methods.calculateTotalPrice = function () {
  const p = Number(this.price);
  const d = Number(this.discount || 0);
  if (isNaN(p) || isNaN(d)) return;

  let finalPrice = p;
  let isOnSale = false;

  if (this.discountType === "percentage") {
    finalPrice = Math.max(p * (1 - d / 100), 0);
    isOnSale = d > 0;
  } else if (this.discountType === "fixed") {
    finalPrice = Math.max(p - d, 0);
    isOnSale = d > 0;
  }

  this.totalPrice = Math.round(finalPrice);
  this.onSale = isOnSale;
};

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });

export const Product = mongoose.model("Product", productSchema);

import { Product } from "../../models/product.model.js";

const getProducts = async (req, res, next) => {
  const {
    limit = 12,
    page = 1,
    collection,
    search,
    sort = "newest",
    minPrice,
    maxPrice,
    gender,
    sizes,
    onSale,
  } = req.query;

  // normalize pagination values
  const limitNum = Number(limit) > 0 ? parseInt(limit, 10) : 12;
  const pageNum = Number(page) > 0 ? parseInt(page, 10) : 1;
  const skip = (pageNum - 1) * limitNum;

  const query = {
    stock: { $gte: 0 },
  };
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  if (gender) query.gender = gender;
  if (onSale) query.onSale = onSale === "true";
  // price range: support 0 and explicit 0 values
  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    query.price = {};
    if (!Number.isNaN(min)) query.price.$gte = min;
    if (!Number.isNaN(max)) query.price.$lte = max;
  }
  if (collection) {
    query.collection = collection;
  }
  if (sizes) {
    let sizeArr = sizes;
    if (typeof sizes === "string") {
      // support comma-separated sizes like "S,M" or single size "M"
      sizeArr = sizes.includes(",")
        ? sizes.split(",").map((s) => s.trim())
        : [sizes];
    }
    query.sizes = { $in: Array.isArray(sizeArr) ? sizeArr : [sizeArr] };
  }
  let sortOption = {};
  if (sort === "newest") sortOption = { createdAt: -1 };
  else if (sort === "oldest") sortOption = { createdAt: 1 };
  else if (sort === "price_asc") sortOption = { price: 1 };
  else if (sort === "price_desc") sortOption = { price: -1 };
  try {
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      status: "success",
      data: products || [],
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    return next(error);
  }
};

const getProduct = async (req, res, next) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: product || [],
    });
  } catch (error) {
    return next(error);
  }
};

const getSearchSuggestions = async (req, res, next) => {
  const { q } = req.query;

  try {
    const query = {
      stock: { $gt: 1 },
      availability: true,
    };

    if (q && q.trim() !== "") {
      const regex = { $regex: `^${q}`, $options: "i" };
      // match either name OR collection
      query.$or = [{ name: regex }, { collection: regex }];
    }
    let products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name _id images price stock collection")
      .lean()
      .exec();

    res.status(200).json({
      status: "success",
      data: products,
      total: products.length,
    });
  } catch (error) {
    return next(error);
  }
};

export { getProducts, getProduct, getSearchSuggestions };

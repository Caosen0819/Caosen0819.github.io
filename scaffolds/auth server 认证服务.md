[toc]





# **Auth认证服务**





## **1、AuthorizationServerConfig**

### **【事先准备】：**

#### **方法、LoadRolePermissionService  调用---> PermissionServiceImpl**

**作用：	从数据库中将url->角色对应关系加载到Redis中**

* **方法1:	listRolePermission **
* * 先从数据库获取permissons
  * 根据roleid从数据库中找权限数据
  * 根据permissionid从数据库中找数据
  * 到此为止，构造了每一个permission对应所需要的权限一共后续使用
  * 简化一下，放入redis

### **【1】AuthorizationServerConfig 继承---> AuthorizationServerConfigurerAdapter**

**作用：	配置认证中心，就是授权服务器配置**

#### **方法1： configure(ClientDetailsServiceConfigurer clients)**

~~~
/**
 * 配置客户端详情，并不是所有的客户端都能接入授权服务
 * 用来配置客户端详情服务（ClientDetailsService），
 * 客户端详情信息在这里进行初始化，
 * 你能够把客户端详情信息写死在这里或者是通过数据库来存储调取详情信息
 
 */
~~~

##### **一、<u>重写configure(ClientDetailsServiceConfigurer clients)方法主要配置客户端，就是告诉auth服务，我有什么客户，每一个客户又是什么样子的</u>**，

1. 定义两个client_id，及客户端可以通过不同的client_id来获取不同的令牌；
2. client_id为test1的令牌有效时间为3600秒，client_id为test2的令牌有效时间为7200秒；
3. client_id为test1的refresh_token（下面会介绍到）有效时间为864000秒，即10天，也就是说在这10天内都可以通过refresh_token来换取新的令牌；
4. 在获取client_id为test1的令牌的时候，scope只能指定为all，a，b或c中的某个值，否则将获取失败；
5. 只能通过密码模式(password)来获取client_id为test1的令牌，而test2则无限制。

##### **二、导入方法有以下几种：**

* **内存**，自己测试的时候比较推荐，后续数据库啊什么的
* **数据库**，使用JdbcClientDetailsService，JdbcClientDetailsService自己是有一个默认的字段的表的，所以程序是从数据库中的oauth_client_details表中加载客户端信息，
* 总而言之，就是配置把客户端信息从数据源拿过来。后面需要授权验证，要用到，所以先配。

#### **方法2： configure(AuthorizationServerEndpointsConfigurer endpoints)------**

上面和客户端有关，而这个则直接和令牌有关，比如<u>**配置授权（authorization）**</u>以及<u>**令牌（token）的访问端点**</u>和<u>**令牌服务(token services)**</u>，还有一些其他的，比如异常啊什么的，下面有例子。

~~~java
/**
* 配置令牌访问的端点
*/
~~~

**令牌端点可用于以编程方式请求令牌（非常重要，四种方式）,下面是配置的例子**

```java
endpoints
        //设置异常WebResponseExceptionTranslator，用于处理用户名，密码错误、授权类型不正确的异常
        .exceptionTranslator(new OAuthServerWebResponseExceptionTranslator())
        //授权码模式所需要的authorizationCodeServices
        .authorizationCodeServices(authorizationCodeServices())
        //密码模式所需要的authenticationManager
        .authenticationManager(authenticationManager)
        //令牌管理服务，无论哪种模式都需要
        .tokenServices(tokenServices())
        //添加进入tokenGranter
        .tokenGranter(new CompositeTokenGranter(tokenGranters))
        //只允许POST提交访问令牌，uri：/oauth/token
        .allowedTokenEndpointRequestMethods(HttpMethod.POST);
```

##### **一、<u>authenticationManager （建议必须配置）  （密码授权管理器），见文件SecurityConfig这个配置类</u>**

* 在Spring Security中，AuthenticationManager的默认实现是ProviderManager，而且它不直接自己处理认证请求，而是委托给其所配置的AuthenticationProvider列表，然后会依次使用每一个AuthenticationProvider进行认证，如果有一个AuthenticationProvider认证后的结果不为null，则表示该AuthenticationProvider已经认证成功，之后的AuthenticationProvider将不再继续认证。然后直接以该AuthenticationProvider的认证结果作为ProviderManager的认证结果。如果所有的AuthenticationProvider的认证结果都为null，则表示认证失败，将抛出一个ProviderNotFoundException。
  校验认证请求最常用的方法是根据请求的用户名加载对应的UserDetails，然后比对UserDetails的密码与认证请求的密码是否一致，一致则表示认证通过。
  Spring Security内部的DaoAuthenticationProvider就是使用的这种方式。其内部使用UserDetailsService来负责加载UserDetails。在认证成功以后会使用加载的UserDetails来封装要返回的Authentication对象，加载的UserDetails对象是包含用户权限等信息的。认证成功返回的Authentication对象将会保存在当前的SecurityContext中

##### <u>**二、令牌本身内容的配置（建议必须配置）**</u>

###### <u>**I、 两种方式，**</u>

【1】直接在endpoint这里配。

【2】自己写个bean注入，举个例子：

###### **II、tokenServices()**  **就在本文件注入,由于是授权服务，所以涉及到颁发令牌，那么有关令牌的管理，比如过期时间，是jwt还是什么格式，客户端存储策略，都在这里**

~~~
@Bean
public AuthorizationServerTokenServices tokenServices() {
    System.out.println("令牌管理服务的配置");
    DefaultTokenServices services = new DefaultTokenServices();
    //客户端端配置策略
    services.setClientDetailsService(clientDetailsService);
    //支持令牌的刷新
    services.setSupportRefreshToken(true);
    //令牌服务
    services.setTokenStore(tokenStore);
    //access_token的过期时间
    services.setAccessTokenValiditySeconds(60 * 60 * 24 * 3);
    //refresh_token的过期时间
    services.setRefreshTokenValiditySeconds(60 * 60 * 24 * 3);

    //设置令牌增强，使用JwtAccessTokenConverter进行转换
    services.setTokenEnhancer(jwtAccessTokenConverter);
    return services;
}
~~~

###### **<u>III、根据项目的要求去选择令牌的内容配置，一般来说都是jwt或者jwt+自定义内容。</u>**

* 把令牌变成jwt格式很简单，按下面2两步操作即可，反正就是

  * ~~~
    @Configuration
    public class JWTokenConfig {
     
        @Bean
        public TokenStore jwtTokenStore() {
            return new JwtTokenStore(jwtAccessTokenConverter());
        }
     
        @Bean
        public JwtAccessTokenConverter jwtAccessTokenConverter() {
            JwtAccessTokenConverter accessTokenConverter = new JwtAccessTokenConverter();
            accessTokenConverter.setSigningKey("test_key"); // 签名密钥
            return accessTokenConverter;
        }
    }
    ~~~

  * ~~~java
        services.setTokenStore(tokenStore);
    ~~~

* 自定义的话，同样简单，按下面的操作来做，无非就是先写一些配置，然后把配置注入adapter

  * ```java
    @Component
    public class JwtTokenEnhancer implements TokenEnhancer {
        @Override
        public OAuth2AccessToken enhance(OAuth2AccessToken accessToken, OAuth2Authentication authentication) {
            SecurityUser securityUser = (SecurityUser) authentication.getPrincipal();
            Map<String, Object> info = new HashMap<>();
            //把用户ID设置到JWT中
            info.put("id", securityUser.getId());
            info.put("client_id",securityUser.getClientId());
            ((DefaultOAuth2AccessToken) accessToken).setAdditionalInformation(info);
            return accessToken;
        }
    }
    ```

  * ~~~
    tokenEnhancer(enhancerChain)
    ~~~

##### **三、tokenGranter(new CompositeTokenGranter(tokenGranters))    自定义授权  非常重要**

作用：自定义授权获取token，下面我们来看一看源码是怎么获取token的，在我们发起oauth/token，请求获取token时，实际上是请求Tokenpoint类的postAccessToken或者getacesstoken方法，相当于调用了一个controller方法，根据请求的方法是get还是post，但其实内部还是调用post的方法。

在TokenEndPoint 获取令牌过程中, 有个这样的步骤:

~~~java
OAuth2AccessToken token = getTokenGranter().grant(tokenRequest.getGrantType(), tokenRequest);
~~~

postAccessToken这个方法中，在这个方法的132行调用TokenGranter类的grant方法来获取token，**<u>这个方法也是最重要的</u>**，通过这个方法我们可以对请求的参数进行校验是否合法，是否给予令牌。

TokenGranter是一个接口，它有多个实现类，CompositeTokenGranter是其中之一，在grant方法中，会循环遍历所有的授权方式，根据请求参数携带的授权方式码，来匹配对应的授权处理实现类，调用实现类中的grant方法。那么关键点来了，请求参数中携带的是我们**<u>自定义的授权方式码</u>**，如果要匹配上，那么首先我们要创建自定义的授权处理类，然后把这个授权处理类放入Spring Security默认的授权处理集合中，这样才能循环匹配上，进行下一步。

和以前的做法一样：创建自定义授权处理类，我们可以继承TokenGranter来实现自定义的身份验证以便获取token，而AbstractTokenGranter是一个继承TokenGranter的实现类，一般我们都会继承这个类进行使用。这一点已经得到验证，可以看下面的流程。

| 实现类                            | 对应的授权模式  |
| --------------------------------- | --------------- |
| AuthorizationCodeTokenGranter     | 授权码模式      |
| ClientCredentialsTokenGranter     | 客户端模式      |
| ImplicitTokenGranter              | implicit 模式   |
| RefreshTokenGranter               | 刷新 token 模式 |
| ResourceOwnerPasswordTokenGranter | 密码模式        |

**这些类都继承了AbstractTokenGranter** 

**AbstractTokenGranter   调用------->getAccessToken -------->getOAuth2Authentication**

**根据 client、tokenRequest 从 OAuth2RequestFactory 中创建一个 OAuth2Request, 进而可得到 OAuth2Authentication (存放着用户的认证信息)。**

**通过 tokenService 去创建 OAuth2AccessToken (存放着用户的 token信息、过期时间)。**



###### **I、————所以，这里加入自定的tokenGrant，也就是要自定义自己的授权方法 去 授权 自定义的令牌——————**



自定义至关重要的一点就是修改**getOAuth2Authentication**方法 （主要文件见sms文件夹和即可）

具体修改不讲，修改的流程就是1、**组装自定义模式的认证信息** 2、**用authenticationManager去调用内部自定义的Provider认证这个认证信息，认证规则自然是写在Provider里面**。可借鉴 https://blog.csdn.net/m0_38031406/article/details/89316342

###### **II、<u>所以实现方式：继承AbstractTokenGranter + 重写 getOAuth2Authentication方法。</u>**

~~~
@Override
protected OAuth2Authentication getOAuth2Authentication(ClientDetails client, TokenRequest tokenRequest) {
    Map<String, String> parameters = new LinkedHashMap<>(tokenRequest.getRequestParameters());
    String mobile = parameters.get("mobile");
    String password = parameters.get("password");
    //将其中的密码移除
    parameters.remove("password");
    //自定义的token类
    Authentication userAuth = new MobilePasswordAuthenticationToken(mobile, password);

    ((AbstractAuthenticationToken) userAuth).setDetails(parameters);
    //调用AuthenticationManager进行认证，内部会根据MobileAuthenticationToken找到对应的Provider进行认证
    userAuth = authenticationManager.authenticate(userAuth);
    if (userAuth == null || !userAuth.isAuthenticated()) {
        throw new InvalidGrantException("Could not authenticate mobile: " + mobile);
    }
    OAuth2Request storedOAuth2Request = getRequestFactory().createOAuth2Request(client, tokenRequest);
    return new OAuth2Authentication(storedOAuth2Request, userAuth);
}
~~~

这里调用了AuthenticationManager认证，后面回调用自定义的XXXXXAuthenticationProvider

###### **III、注入**

~~~
.tokenGranter(new CompositeTokenGranter(tokenGranters))
~~~



##### **四、new OAuthServerWebResponseExceptionTranslator()**  也是自己配置的见文件夹**Exception**

自定义异常翻译器，针对用户名、密码异常，授权类型不支持的异常进行处理-----**关键是用户**

##### **五、authorizationCodeServices()就在本文件注入**

##### **六、待续**。。。。。。



#### **方法3： configure(AuthorizationServerSecurityConfigurer security)**

```java
/**
 * 配置令牌访问的安全约束（）
 */
```

##### **一、配置OAuthServerClientCredentialsTokenEndpointFilter------主要是客户端的验证**

```java
/**
 * @author 客户端异常处理
 * 自定义的客户端认证的过滤器，根据客户端的id、秘钥进行认证
 * 重写这个过滤器用于自定义异常处理
 * 具体认证的逻辑依然使用ClientCredentialsTokenEndpointFilter，只是设置一下AuthenticationEntryPoint为定制
 */
    @Override
public void configure(AuthorizationServerSecurityConfigurer security) {
        System.out.println("配置令牌访问的安全约束");
      //自定义ClientCredentialsTokenEndpointFilter，用于处理客户端id，密码错误的异常
        OAuthServerClientCredentialsTokenEndpointFilter endpointFilter = new OAuthServerClientCredentialsTokenEndpointFilter(security,authenticationEntryPoint);
        endpointFilter.afterPropertiesSet();
        security.addTokenEndpointAuthenticationFilter(endpointFilter);

        security
                .authenticationEntryPoint(authenticationEntryPoint)
                //开启/oauth/token_key验证端口权限访问
                .tokenKeyAccess("permitAll()")
                //开启/oauth/check_token验证端口认证权限访问
                .checkTokenAccess("permitAll()");
                //一定不要添加allowFormAuthenticationForClients，否则自定义的OAuthServerClientCredentialsTokenEndpointFilter不生效
//                .allowFormAuthenticationForClients();
    }
}
```

###### **I、具体认证的逻辑依然使用ClientCredentialsTokenEndpointFilter，只是设置一下AuthenticationEntryPoint为定制**

**既然如此，我们就去看自定义的AuthenticationEntryPoint**，这里没改，实际中可以改

```java
public class OAuthServerAuthenticationEntryPoint implements AuthenticationEntryPoint {

    /**
     * 认证失败处理器会调用这个方法返回提示信息
     * TODO 实际开发中可以自己定义，此处直接返回JSON数据：客户端认证失败错误提示
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
        ResponseUtils.result(response,new ResultMsg(ResultCode.CLIENT_AUTHENTICATION_FAILED.getCode(),ResultCode.CLIENT_AUTHENTICATION_FAILED.getMsg(),null));
    }
}
```

###### **II、endpointFilter.afterPropertiesSet();** 认证成功怎么办，认真失败怎么办，这里可以自定义哈哈

```java
/**
 * 设置AuthenticationEntryPoint主要逻辑
 */
@Override
public void afterPropertiesSet() {
    System.out.println("设置AuthenticationEntryPoint主要逻辑");
    //TODO 定制认证失败处理器，开发中可以自己修改
    setAuthenticationFailureHandler((request, response, exception) -> {
        if (exception instanceof BadCredentialsException) {
            exception = new BadCredentialsException(exception.getMessage(), new BadClientCredentialsException());
        }
        authenticationEntryPoint.commence(request, response, exception);
    });
    //成功处理器，和父类相同，为空即可。
    setAuthenticationSuccessHandler((request, response, authentication) -> {
    });
}
```

###### **III、security.addTokenEndpointAuthenticationFilter(endpointFilter);**

* 注入 自定义相应异常的过滤链



## **2、springconfig**

### **介绍一个比较完整的securityconfig配置**

~~~java
@Configuration
//开启判断用户对某个控制层的方法是否具有访问权限的功能
@EnableGlobalMethodSecurity(prePostEnabled = true)
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    //注入自定义的UserDetailService
    @Autowired
    @Lazy
    private UserDetailsServiceImpl userDetailsServiceImpl;
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    //替换默认AuthenticationManager中的UserDetailService，使用数据库用户认证方式登录
    //1. 一旦通过 configure 方法自定义 AuthenticationManager实现 就回将工厂中自动配置AuthenticationManager 进行覆盖
    //2. 一旦通过 configure 方法自定义 AuthenticationManager实现 需要在实现中指定认证数据源对象 UserDetailService 实例
    //3. 一旦通过 configure 方法自定义 AuthenticationManager实现 这种方式创建AuthenticationManager对象工厂内部本地一个 AuthenticationManager 对象 不允许在其他自定义组件中进行注入
    @Override
    protected void configure(AuthenticationManagerBuilder builder) throws Exception {
        builder.userDetailsService(userDetailsServiceImpl);
    }

    /**
     * BCryptPasswordEncoder相关知识：
     * 用户表的密码通常使用MD5等不可逆算法加密后存储，为防止彩虹表破解更会先使用一个特定的字符串（如域名）加密，然后再使用一个随机的salt（盐值）加密。
     * 特定字符串是程序代码中固定的，salt是每个密码单独随机，一般给用户表加一个字段单独存储，比较麻烦。
     * BCrypt算法将salt随机并混入最终加密后的密码，验证时也无需单独提供之前的salt，从而无需单独处理salt问题。
     */
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


    //将自定义AuthenticationManager在工厂中进行暴露,可以在任何位置注入
    @Override
    @Bean
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }

    //HttpSecurity配置
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.cors(withDefaults())
                // 禁用 CSRF
                .csrf().disable()
                .authorizeRequests()
                // 指定的接口直接放行
                // swagger
                .antMatchers(SecurityConstants.SWAGGER_WHITELIST).permitAll()
                .antMatchers(SecurityConstants.H2_CONSOLE).permitAll()
                .antMatchers(HttpMethod.POST, SecurityConstants.SYSTEM_WHITELIST).permitAll()
                // 其他的接口都需要认证后才能请求
                .anyRequest().authenticated()
                .and()
                //添加自定义Filter
                .addFilter(new JwtAuthorizationFilter(authenticationManager(), stringRedisTemplate))
                // 不需要session（不创建会话）
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
                // 授权异常处理
                .exceptionHandling()
                // json提示用户没有登录不需要用户跳转到登录页面去
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint())
                // 权限拦截器，提示用户没有当前权限
                .accessDeniedHandler(new JwtAccessDeniedHandler());
        // 防止H2 web 页面的Frame 被拦截
        http.headers().frameOptions().disable();
    }

    /**
     * Cors配置优化
     **/
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(singletonList("*"));
        // configuration.setAllowedOriginPatterns(singletonList("*"));
        configuration.setAllowedHeaders(singletonList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "DELETE", "PUT", "OPTIONS"));
        configuration.setExposedHeaders(singletonList(SecurityConstants.TOKEN_HEADER));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

~~~



# 鉴权服务

和授权服务，许多程序都是围绕着配置类进行的，所以我们直接看配置类

## **【1】AccessTokenConfig**  令牌的一些配置

* 和授权服务一致，因为令牌要从授权服务到网关，再到客户端，不管是为了现在的还是后续的操作，最好配置，当然，用不到也可以不配，看你用不用得到。

## **【2】JwtAuthenticationManager token认证管理器**

```java
/**
 * @author 公众号：码猿技术专栏
 * JWT认证管理器，主要的作用就是对携带过来的token进行校验，比如过期时间，加密方式等
 * 一旦token校验通过，则交给鉴权管理器进行鉴权
 */
```

```java
@Override
public Mono<Authentication> authenticate(Authentication authentication) {

    System.out.println("第六步***来到JWT认证管理器 检验token");

    return Mono.justOrEmpty(authentication)
            .filter(a -> a instanceof BearerTokenAuthenticationToken)
            .cast(BearerTokenAuthenticationToken.class)
            .map(BearerTokenAuthenticationToken::getToken)
            .flatMap((accessToken -> {
                OAuth2AccessToken oAuth2AccessToken = this.tokenStore.readAccessToken(accessToken);
                //根据access_token从数据库获取不到OAuth2AccessToken
                if (oAuth2AccessToken == null) {
                    return Mono.error(new InvalidTokenException("无效的token！"));
                } else if (oAuth2AccessToken.isExpired()) {
                    return Mono.error(new InvalidTokenException("token已过期！"));
                }
                OAuth2Authentication oAuth2Authentication = this.tokenStore.readAuthentication(accessToken);
                if (oAuth2Authentication == null) {
                    return Mono.error(new InvalidTokenException("无效的token！"));
                } else {
                    return Mono.just(oAuth2Authentication);
                }
            })).cast(Authentication.class);
}
```



## **【3】JwtAccessManagerV2-------认证管理器自定义**

* 作用：认证管理的作用就是获取传递过来的令牌，对其进行解析、验签、过期时间判定。就是作为的鉴权
* 获取调用方法【get/post...】+uri.getPath()  合成完整路径例如：【uri.getPath()】
* 从redis里面获取获取所有的uri->角色对应关系
* 去链接里面找到和自己这次申请链接完全一致的那一个键值对，而这个键值对的值恰恰就是【权限集合】
* 把自己的权限先从mono中解析出来，然后匹配，如果超级管理员，放行；如果存在交集，则通过；否则失败

异常

* RequestAuthenticationEntryPoint
  * 用于处理没有登录或token过期时的自定义返回结果

* RequestAccessDeniedHandler
  * 自定义返回结果：没有权限访问时
* RequestAuthenticationEntryPoint
  * 用于处理没有登录或token过期时的自定义返回结果

## **【4】 SecurityConfig  在webflux中使用security**

### **1、webFluxSecurityFilterChain------把之前的配置整合链路**

* **这里使用的是webFluxSecurityFilterChain**
* http下的功能可以借鉴http://events.jianshu.io/p/8ad366b97e18

~~~
        SecurityWebFilterChain webFluxSecurityFilterChain(ServerHttpSecurity http) throws Exception{
        //认证过滤器，放入认证管理器tokenAuthenticationManager
        AuthenticationWebFilter authenticationWebFilter = new AuthenticationWebFilter(tokenAuthenticationManager);
        System.out.println("认证过滤器，放入认证管理器tokenAuthenticationManager");
        authenticationWebFilter.setServerAuthenticationConverter(new ServerBearerTokenAuthenticationConverter());

        http
                .httpBasic().disable()
                .csrf().disable()
                .authorizeExchange()
                //白名单直接放行
                .pathMatchers(ArrayUtil.toArray(sysConfig.getIgnoreUrls(),String.class)).permitAll()
                //其他的请求必须鉴权，使用鉴权管理器
                .anyExchange().access(accessManager)
                //鉴权的异常处理，权限不足，token失效
                .and().exceptionHandling()
                .authenticationEntryPoint(requestAuthenticationEntryPoint)
                .accessDeniedHandler(requestAccessDeniedHandler)
                .and()
                // 跨域过滤器
                .addFilterAt(corsFilter, SecurityWebFiltersOrder.CORS)
                //token的认证过滤器，用于校验token和认证
                .addFilterAt(authenticationWebFilter, SecurityWebFiltersOrder.AUTHENTICATION);
        return http.build();
    }
~~~

#### **一、加入了【2】的自定义令牌认证管理器**

#### **二、加入了【3】的鉴权管理器**

### **2、白名单放行 **

```
//白名单直接放行
.pathMatchers(ArrayUtil.toArray(sysConfig.getIgnoreUrls(),String.class)).permitAll()
//其他的请求必须鉴权，使用鉴权管理器
.anyExchange().access(accessManager)
```

### **3、鉴权的异常处理**

```
//鉴权的异常处理，权限不足，token失效
.and().exceptionHandling()
.authenticationEntryPoint(requestAuthenticationEntryPoint)
.accessDeniedHandler(requestAccessDeniedHandler)
```

# 异常配置

## 【1】认证服务的异常

- 用户名，密码错误异常、授权类型异常
- 客户端ID、秘钥异常

### **1、用户名，密码错误异常、授权类型异常**

针对用户名、密码、授权类型错误的异常解决方式比较复杂，需要定制的比较多。

#### **一、定制提示信息、响应码**

这部分根据自己业务需要定制，举个例子，代码如下：

```java
public enum ResultCode {

    CLIENT_AUTHENTICATION_FAILED(1001,"客户端认证失败"),

    USERNAME_OR_PASSWORD_ERROR(1002,"用户名或密码错误"),

    UNSUPPORTED_GRANT_TYPE(1003, "不支持的认证模式"),

    NO_PERMISSION(1005,"无权限访问！"),
    UNAUTHORIZED(401, "系统错误"),

    INVALID_TOKEN(1004,"无效的token");
```

#### **二、自定义WebResponseExceptionTranslator**

* 需要自定义一个异常翻译器，默认的是**DefaultWebResponseExceptionTranslator**，此处必须重写，其中有一个需要实现的方法，如下：

  ```java
  ResponseEntity<T> translate(Exception e) throws Exception;
  ```

  这个方法就是根据传递过来的**Exception**判断不同的异常返回特定的信息，这里需要判断的异常的如下：

  - **UnsupportedGrantTypeException**：不支持的授权类型异常
  - **InvalidGrantException**：用户名或者密码错误的异常

* 创建一个**OAuthServerWebResponseExceptionTranslator**实现**WebResponseExceptionTranslator**，代码如下：

* ```java
  public class OAuthServerWebResponseExceptionTranslator implements WebResponseExceptionTranslator{
      /**
       * 业务处理方法，重写这个方法返回客户端信息
       */
      @Override
      public ResponseEntity<ResultMsg> translate(Exception e){
          ResultMsg resultMsg = doTranslateHandler(e);
          return new ResponseEntity<>(resultMsg, HttpStatus.UNAUTHORIZED);
      }
  
      /**
       * 根据异常定制返回信息
       * TODO 自己根据业务封装
       */
      private ResultMsg doTranslateHandler(Exception e) {
          //初始值，系统错误，
          ResultCode resultCode = ResultCode.UNAUTHORIZED;
          //判断异常，不支持的认证方式
          if(e instanceof UnsupportedGrantTypeException){
              resultCode = ResultCode.UNSUPPORTED_GRANT_TYPE;
              //用户名或密码异常
          }else if(e instanceof InvalidGrantException){
              resultCode = ResultCode.USERNAME_OR_PASSWORD_ERROR;
          }
          return new ResultMsg(resultCode.getCode(),resultCode.getMsg(),null);
      }
  }
  ```

#### **三、认证服务配置文件中配置**

需要将自定义的异常翻译器**OAuthServerWebResponseExceptionTranslator**在配置文件中配置，很简单，一行代码的事。

在**AuthorizationServerConfig**配置文件指定，代码如下：

![image-20220906203102659](C:\Users\CSEN\AppData\Roaming\Typora\typora-user-images\image-20220906203102659.png)

#### **四、这么配置的原因**

* 我们知道获取令牌的接口为 **/oauth/token**，这个接口定义在**TokenEndpoint#postAccessToken()**（POST请求）方法中，如下图
* ![image-20220906203752062](C:\Users\CSEN\AppData\Roaming\Typora\typora-user-images\image-20220906203752062.png)
* 是不是都继承了**OAuth2Exception**，那么尝试在**TokenEndpoint**这个类中找找有没有处理**OAuth2Exception**这个异常的处理器，果然找到了一个 **handleException()** 方法，如下：
* ![image-20220906203840232](C:\Users\CSEN\AppData\Roaming\Typora\typora-user-images\image-20220906203840232.png)
* 可以看到，这里的异常翻译器已经使用了我们自定义的**OAuthServerWebResponseExceptionTranslator**。可以看下默认的异常翻译器是啥，代码如下：

### **2、客户端ID、秘钥异常**

这部分比较复杂，想要理解还是需要些基础的，解决这个异常的方案很多，陈某只是介绍其中一种，下面详细介绍。

#### **一、定制提示信息、响应码**

这部分根据自己业务需要定制，和第一步一样。

#### **二、自定义AuthenticationEntryPoint**

这个**AuthenticationEntryPoint**是不是很熟悉，前面的文章已经介绍过了，此处需要自定义来返回定制的提示信息。

创建**OAuthServerAuthenticationEntryPoint**，实现AuthenticationEntryPoint，重写其中的方法，代码如下：

* ```java
  public class OAuthServerAuthenticationEntryPoint implements AuthenticationEntryPoint {
  
      /**
       * 认证失败处理器会调用这个方法返回提示信息
       * TODO 实际开发中可以自己定义，此处直接返回JSON数据：客户端认证失败错误提示
       */
      @Override
      public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
          ResponseUtils.result(response,new ResultMsg(ResultCode.CLIENT_AUTHENTICATION_FAILED.getCode(),ResultCode.CLIENT_AUTHENTICATION_FAILED.getMsg(),null));
      }
  }
  ```

#### **三、改造ClientCredentialsTokenEndpointFilter**

**ClientCredentialsTokenEndpointFilter**这个过滤器的主要作用就是校验客户端的ID、秘钥，代码如下：

~~~
public class OAuthServerClientCredentialsTokenEndpointFilter extends ClientCredentialsTokenEndpointFilter {

    private final AuthorizationServerSecurityConfigurer configurer;

    private AuthenticationEntryPoint authenticationEntryPoint;

    /**
     * 构造方法
     * @param configurer AuthorizationServerSecurityConfigurer对昂
     * @param authenticationEntryPoint 自定义的AuthenticationEntryPoint
     */
    public OAuthServerClientCredentialsTokenEndpointFilter(AuthorizationServerSecurityConfigurer configurer, AuthenticationEntryPoint authenticationEntryPoint) {
        System.out.println("自定义的客户端认证的过滤器的构造方法");
        this.configurer = configurer;
        this.authenticationEntryPoint=authenticationEntryPoint;
    }

    @Override
    public void setAuthenticationEntryPoint(AuthenticationEntryPoint authenticationEntryPoint) {
        System.out.println("setAuthenticationEntryPoint");
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    /**
     * 需要重写这个方法，返回AuthenticationManager
     */
    @Override
    protected AuthenticationManager getAuthenticationManager() {
        System.out.println("getAuthenticationManager");
        return configurer.and().getSharedObject(AuthenticationManager.class);
    }

    /**
     * 设置AuthenticationEntryPoint主要逻辑
     */
    @Override
    public void afterPropertiesSet() {
        System.out.println("设置AuthenticationEntryPoint主要逻辑");
        //TODO 定制认证失败处理器，开发中可以自己修改
        setAuthenticationFailureHandler((request, response, exception) -> {
            if (exception instanceof BadCredentialsException) {
                exception = new BadCredentialsException(exception.getMessage(), new BadClientCredentialsException());
            }
            authenticationEntryPoint.commence(request, response, exception);
        });
        //成功处理器，和父类相同，为空即可。
        setAuthenticationSuccessHandler((request, response, authentication) -> {
        });
    }
}
~~~

有几个重要的部分需要讲一下，如下：

- 构造方法中需要传入第2步自定义的 **OAuthServerAuthenticationEntryPoint**
- 重写 **getAuthenticationManager()** 方法返回IOC中的AuthenticationManager
- 重写**afterPropertiesSet()** 方法，用于自定义认证失败、成功处理器，失败处理器中调用**OAuthServerAuthenticationEntryPoint**进行异常提示信息返回

#### **四、OAuth配置文件中指定过滤器**

只需要将自定义的过滤器添加到**AuthorizationServerSecurityConfigurer**中，代码如下：

```
@Override
    public void configure(AuthorizationServerSecurityConfigurer security) {
        System.out.println("配置令牌访问的安全约束");
        //自定义ClientCredentialsTokenEndpointFilter，用于处理客户端id，密码错误的异常
        ①OAuthServerClientCredentialsTokenEndpointFilter endpointFilter = new OAuthServerClientCredentialsTokenEndpointFilter(security,authenticationEntryPoint);
       ① endpointFilter.afterPropertiesSet();
        ①security.addTokenEndpointAuthenticationFilter(endpointFilter);

        security
                .authenticationEntryPoint(authenticationEntryPoint)
                //开启/oauth/token_key验证端口权限访问
                .tokenKeyAccess("permitAll()")
                //开启/oauth/check_token验证端口认证权限访问
                .checkTokenAccess("permitAll()");
               ② //一定不要添加allowFormAuthenticationForClients，否则自定义的OAuthServerClientCredentialsTokenEndpointFilter不生效
//                .allowFormAuthenticationForClients();
    }
```

第**①**部分是添加过滤器，其中**authenticationEntryPoint**使用的是第2步自定义的**OAuthServerAuthenticationEntryPoint**

第**②**部分一定要注意：一定要去掉这行代码，具体原因源码解释。

#### **五、源码追踪**

###### **I、OAuthServerAuthenticationEntryPoint在何时调用？**

OAuthServerAuthenticationEntryPoint这个过滤器继承了 **AbstractAuthenticationProcessingFilter** 这个抽象类，一切的逻辑都在 **doFilter()** 中，陈某简化了其中的关键代码如下：

~~~
public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
			throws IOException, ServletException {
    try {
        	//调用子类的attemptAuthentication方法，获取参数并且认证
			authResult = attemptAuthentication(request, response);
		}
		catch (InternalAuthenticationServiceException failed) {
            //一旦认证异常，则调用unsuccessfulAuthentication方法，通过failureHandler处理
			unsuccessfulAuthentication(request, response, failed);
			return;
		}
		catch (AuthenticationException failed) {
            //一旦认证异常，则调用unsuccessfulAuthentication方法，通过failureHandler处理
			unsuccessfulAuthentication(request, response, failed);
			return;
		}
		//认证成功，则调用successHandler处理
		successfulAuthentication(request, response, chain, authResult);
}
~~~

关键代码在 **unsuccessfulAuthentication()** 这个方法中，代码如下

~~~
    protected void unsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response, AuthenticationException failed) throws IOException, ServletException {
        SecurityContextHolder.clearContext();
        if (this.logger.isDebugEnabled()) {
            this.logger.debug("Authentication request failed: " + failed.toString(), failed);
            this.logger.debug("Updated SecurityContextHolder to contain null Authentication");
            this.logger.debug("Delegating to authentication failure handler " + this.failureHandler);
        }

        this.rememberMeServices.loginFail(request, response);
        this.failureHandler.onAuthenticationFailure(request, response, failed);
    }
~~~

###### **II、自定义的过滤器如何生效的？**

这个就要看 **AuthorizationServerSecurityConfigurer#configure()** 这个方法了，其中有一段代码如下：

```
while(var2.hasNext()) {
    Filter filter = (Filter)var2.next();
    http.addFilterBefore(filter, BasicAuthenticationFilter.class);
}
```

也就是说，我们自定义的过滤链被加到了BasicAuthenticationFilter里面

###### **III、为什么不能加.allowFormAuthenticationForClients()？**

还是在 **AuthorizationServerSecurityConfigurer#configure()** 这个方法中，一旦设置了 **allowFormAuthenticationForClients** 为true，则会创建 **ClientCredentialsTokenEndpointFilter**，此时自定义的自然失效了。

## **【2】资源服务自定义异常信息**

下面针对上述两种异常分别定制异常提示信息，这个比认证服务定制简单。

### **1、自定义返回结果：没有权限访问时**

```java
@Component
public class RequestAccessDeniedHandler implements ServerAccessDeniedHandler {
    @Override
    public Mono<Void> handle(ServerWebExchange exchange, AccessDeniedException denied) {

        System.out.println("RequestAccessDeniedHandler");
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.OK);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        System.out.println("wuquan2");

        String body= JSONUtil.toJsonStr(new ResultMsg(ResultCode.NO_PERMISSION.getCode(),ResultCode.NO_PERMISSION.getMsg(),null));
        DataBuffer buffer =  response.bufferFactory().wrap(body.getBytes(Charset.forName("UTF-8")));
        return response.writeWith(Mono.just(buffer));
    }
}
```



### **2、用于处理没有登录或token过期时的自定义返回结果**



# 令牌配置

## 【1】令牌本身的配置

* 令牌相关的配置都放在了AccessTokenConfig这个配置类中，代码如下：

~~~
@Configuration
public class AccessTokenConfig {
    /**
     * 令牌的存储策略
     */
    @Bean
    public TokenStore tokenStore() {
        //使用JwtTokenStore生成JWT令牌
        return new JwtTokenStore(jwtAccessTokenConverter());
    }

    /**
     * JwtAccessTokenConverter
     * TokenEnhancer的子类，在JWT编码的令牌值和OAuth身份验证信息之间进行转换。
     * TODO：后期可以使用非对称加密
     */
    @Bean
    public JwtAccessTokenConverter jwtAccessTokenConverter(){
        JwtAccessTokenConverter converter = new JwtAccessTokenEnhancer();
        // 设置秘钥
        converter.setSigningKey(TokenConstant.SIGN_KEY);
        /*
         * 设置自定义得的令牌转换器，从map中转换身份信息
         * fix(*)：修复刷新令牌无法获取用户详细信息的问题
         */
        converter.setAccessTokenConverter(new JwtEnhanceAccessTokenConverter());
        return converter;
    }

    /**
     * JWT令牌增强，继承JwtAccessTokenConverter
     * 将业务所需的额外信息放入令牌中，这样下游微服务就能解析令牌获取
     */
    public static class JwtAccessTokenEnhancer extends JwtAccessTokenConverter {
        /**
         * 重写enhance方法，在其中扩展
         */
        @Override
        public OAuth2AccessToken enhance(OAuth2AccessToken accessToken, OAuth2Authentication authentication) {
            Object principal = authentication.getUserAuthentication().getPrincipal();
            if (principal instanceof SecurityUser){
                //获取userDetailService中查询到用户信息
                SecurityUser user=(SecurityUser)principal;
                //将额外的信息放入到LinkedHashMap中
                LinkedHashMap<String,Object> extendInformation=new LinkedHashMap<>();
                //设置用户的userId
                extendInformation.put(TokenConstant.USER_ID,user.getUserId());
                //添加到additionalInformation
                ((DefaultOAuth2AccessToken) accessToken).setAdditionalInformation(extendInformation);
            }
            return super.enhance(accessToken, authentication);
        }
    }
}
~~~

* **1、JwtAccessTokenConverter**

令牌增强类，用于JWT令牌和OAuth身份进行转换

```
@Bean
public JwtAccessTokenConverter jwtAccessTokenConverter(){
    JwtAccessTokenConverter converter = new JwtAccessTokenEnhancer();
    // 设置秘钥
    converter.setSigningKey(TokenConstant.SIGN_KEY);
    /*
     * 设置自定义得的令牌转换器，从map中转换身份信息
     * fix(*)：修复刷新令牌无法获取用户详细信息的问题
     */
    converter.setAccessTokenConverter(new JwtEnhanceAccessTokenConverter());
    return converter;
}
```

* **2、TokenStore**

令牌的存储策略，这里使用的是JwtTokenStore，使用JWT的令牌生成方式，其实还有以下两个比较常用的方式

* * RedisTokenStore：将令牌存储到Redis中，此种方式相对于内存方式来说性能更好
  *  JdbcTokenStore：将令牌存储到数据库中，需要新建从对应的表，有兴趣的可以尝试

* **3**、**SIGN_KEY**

JWT签名的秘钥，这里使用的是对称加密，资源服务中也要使用相同的秘钥进行校验和解析JWT令牌。



## 【2】令牌管理服务的配置

**这个放在了AuthorizationServerConfig这个配置类中，代码如下：**

* **使用的是DefaultTokenServices这个实现类，其中可以配置令牌相关的内容，比如access_token、refresh_token的过期时间，默认时间分别为12小时、30天。**
* **最重要的一行代码当然是设置令牌增强，使用JWT方式生产令牌，如下：services.setTokenEnhancer(jwtAccessTokenConverter);**

```java
@Bean
public AuthorizationServerTokenServices tokenServices() {
    System.out.println("令牌管理服务的配置");
    DefaultTokenServices services = new DefaultTokenServices();
    //客户端端配置策略
    services.setClientDetailsService(clientDetailsService);
    //支持令牌的刷新
    services.setSupportRefreshToken(true);
    //令牌服务
    services.setTokenStore(tokenStore);
    //access_token的过期时间
    services.setAccessTokenValiditySeconds(60 * 60 * 24 * 3);
    //refresh_token的过期时间
    services.setRefreshTokenValiditySeconds(60 * 60 * 24 * 3);

    //设置令牌增强，使用JwtAccessTokenConverter进行转换
    services.setTokenEnhancer(jwtAccessTokenConverter);
    return services;
}
```

## 【3】、令牌访问端点添加tokenServices



# 前置知识：security

## security的核心，Spring Security使用了springSecurityFilterChain作为了安全过滤的入口

## 【1】Spring Security过滤器

### 1、核心过滤器概述

从控制台打印过滤器可见

~~~java
org.springframework.security.web.util.matcher.AnyRequestMatcher@1,
[
org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter@184de357,
    org.springframework.security.web.context.SecurityContextPersistenceFilter@521ba38f,
    org.springframework.security.web.header.HeaderWriterFilter@77bb916f,
    org.springframework.security.web.csrf.CsrfFilter@76b305e1,
    org.springframework.security.web.authentication.logout.LogoutFilter@17c53dfb,
    org.springframework.security.web.savedrequest.RequestCacheAwareFilter@2086d469,
    org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter@b1d19ff,
    org.springframework.security.web.authentication.AnonymousAuthenticationFilter@efe49ab,
    org.springframework.security.web.session.SessionManagementFilter@5a48d186,
    org.springframework.security.web.access.ExceptionTranslationFilter@273aaab7

]
~~~

* SecurityContextPersistenceFilter 两个主要职责：请求来临时，创建SecurityContext安全上下文信息，请求结束时清空SecurityContextHolder。
* HeaderWriterFilter (文档中并未介绍，非核心过滤器) 用来给http响应添加一些Header,比如X-Frame-Options, X-XSS-Protection*，X-Content-Type-Options.
* CsrfFilter 在spring4这个版本中被默认开启的一个过滤器，用于防止csrf攻击，了解前后端分离的人一定不会对这个攻击方式感到陌生，前后端使用json交互需要注意的一个问题。
* LogoutFilter 顾名思义，处理注销的过滤器
* UsernamePasswordAuthenticationFilter 这个会重点分析，表单提交了username和password，被封装成token进行一系列的认证，便是主要通过这个过滤器完成的，在表单认证的方法中，这是最最关键的过滤器。
* RequestCacheAwareFilter (文档中并未介绍，非核心过滤器) 内部维护了一个RequestCache，用于缓存request请求
* SecurityContextHolderAwareRequestFilter 此过滤器对ServletRequest进行了一次包装，使得request具有更加丰富的API
* AnonymousAuthenticationFilter 匿名身份过滤器，这个过滤器个人认为很重要，需要将它
* UsernamePasswordAuthenticationFilter 放在一起比较理解，spring security为了兼容未登录的访问，也走了一套认证流程，只不过是一个匿名的身份。
* SessionManagementFilter 和session相关的过滤器，内部维护了一个SessionAuthenticationStrategy，两者组合使用，常用来防止session-fixation protection attack，以及限制同一用户开启多个会话的数量
* ExceptionTranslationFilter 直译成异常翻译过滤器，还是比较形象的，这个过滤器本身不处理异常，而是将认证过程中出现的异常交给内部维护的一些类去处理，具体是那些类下面详细介绍
* FilterSecurityInterceptor 这个过滤器决定了访问特定路径应该具备的权限，访问的用户的角色，权限是什么？访问的路径需要什么样的角色和权限？这些判断和处理都是由该类进行的
  

## 【2】Spring Security核心过滤器解析



### 1、SecurityContextPersistenceFilter

SecurityContextPersistenceFilter的两个主要作用便是请求来临时，创建SecurityContext安全上下文信息和请求结束时清空SecurityContextHolder

~~~java
public class SecurityContextPersistenceFilter extends GenericFilterBean {

   static final String FILTER_APPLIED = "__spring_security_scpf_applied";
   //安全上下文存储的仓库
   private SecurityContextRepository repo;

   public SecurityContextPersistenceFilter() {
      //HttpSessionSecurityContextRepository是SecurityContextRepository接口的一个实现类
      //使用HttpSession来存储SecurityContext
      this(new HttpSessionSecurityContextRepository());
   }

   public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
         throws IOException, ServletException {
      HttpServletRequest request = (HttpServletRequest) req;
      HttpServletResponse response = (HttpServletResponse) res;

      if (request.getAttribute(FILTER_APPLIED) != null) {
         // ensure that filter is only applied once per request
         chain.doFilter(request, response);
         return;
      }
      request.setAttribute(FILTER_APPLIED, Boolean.TRUE);
      //包装request，response
      HttpRequestResponseHolder holder = new HttpRequestResponseHolder(request,
            response);
      //从Session中获取安全上下文信息
      SecurityContext contextBeforeChainExecution = repo.loadContext(holder);
      try {
         //请求开始时，设置安全上下文信息，这样就避免了用户直接从Session中获取安全上下文信息
         SecurityContextHolder.setContext(contextBeforeChainExecution);
         chain.doFilter(holder.getRequest(), holder.getResponse());
      }
      finally {
         //请求结束后，清空安全上下文信息
         SecurityContext contextAfterChainExecution = SecurityContextHolder
               .getContext();
         SecurityContextHolder.clearContext();
         repo.saveContext(contextAfterChainExecution, holder.getRequest(),
               holder.getResponse());
         request.removeAttribute(FILTER_APPLIED);
         if (debug) {
            logger.debug("SecurityContextHolder now cleared, as request processing completed");
         }
      }
   }

}

~~~

### 2、SecurityContextPersistenceFilter

内部调用了authenticationManager完成认证，根据认证结果执行successfulAuthentication或者unsuccessfulAuthentication，无论成功失败，一般的实现都是转发或者重定向等处理，不再细究AuthenticationSuccessHandler和AuthenticationFailureHandler，有兴趣的朋友，可以去看看两者的实现类。



### 2.3 AnonymousAuthenticationFilter

匿名认证过滤器，可能有人会想：匿名了还有身份？我自己对于Anonymous匿名身份的理解是Spring Security为了整体逻辑的统一性，即使是未通过认证的用户，也给予了一个匿名身份。而AnonymousAuthenticationFilter该过滤器的位置也是非常的科学的，它位于常用的身份认证过滤器（如UsernamePasswordAuthenticationFilter、BasicAuthenticationFilter、RememberMeAuthenticationFilter）之后，意味着只有在上述身份过滤器执行完毕后，SecurityContext依旧没有用户信息，AnonymousAuthenticationFilter该过滤器才会有意义—-基于用户一个匿名身份。



### 2.4 ExceptionTranslationFilter

ExceptionTranslationFilter异常转换过滤器位于整个springSecurityFilterChain的后方，用来转换整个链路中出现的异常，将其转化，顾名思义，转化以意味本身并不处理。一般其只处理两大类异常：AccessDeniedException访问异常和AuthenticationException认证异常。

这个过滤器非常重要，因为它将Java中的异常和HTTP的响应连接在了一起，这样在处理异常时，我们不用考虑密码错误该跳到什么页面，账号锁定该如何，只需要关注自己的业务逻辑，抛出相应的异常便可。如果该过滤器检测到AuthenticationException，则将会交给内部的AuthenticationEntryPoint去处理，如果检测到AccessDeniedException，需要先判断当前用户是不是匿名用户，如果是匿名访问，则和前面一样运行AuthenticationEntryPoint，否则会委托给AccessDeniedHandler去处理，而AccessDeniedHandler的默认实现，是AccessDeniedHandlerImpl。所以ExceptionTranslationFilter内部的AuthenticationEntryPoint是至关重要的，顾名思义：认证的入口点。



### 2.5 FilterSecurityInterceptor

我们已经有了认证，有了请求的封装，有了Session的关联，还缺一个：由什么控制哪些资源是受限的，这些受限的资源需要什么权限，需要什么角色…这一切和访问控制相关的操作，都是由FilterSecurityInterceptor完成的。

FilterSecurityInterceptor的工作流程可以理解如下：FilterSecurityInterceptor从SecurityContextHolder中获取Authentication对象，然后比对用户拥有的权限和资源所需的权限。前者可以通过Authentication对象直接获得，而后者则需要引入我们之前一直未提到过的两个类：SecurityMetadataSource，AccessDecisionManager。理解清楚决策管理器的整个创建流程和SecurityMetadataSource的作用需要花很大一笔功夫，这里，暂时只介绍其大概的作用



